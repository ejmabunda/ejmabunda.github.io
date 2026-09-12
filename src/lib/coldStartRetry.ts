/**
 * Retry helpers for the anonymous read endpoints, tuned for the free-tier Azure
 * App Service cold start.
 *
 * When the instance has idled out (roughly 20 minutes of inactivity) the Azure
 * load balancer holds the first request open while the worker boots, and only
 * gives up after ~230s on Windows / ~240s on Linux — at which point it drops
 * the connection and returns a timeout. So a single request during a cold start
 * can hang for minutes, or be dropped outright, and the client has to keep
 * trying across that whole window before deciding the API is genuinely down.
 *
 * Previously this gave up after ~40s, which is well inside a normal cold start,
 * so a first visit to a sleeping backend looked like a hard failure.
 */

import { trackApiRequest } from "./apiWake";

/**
 * Per-attempt cap. Long enough for one held connection to ride out a typical
 * cold start; short enough that a wedged request doesn't burn the whole budget
 * before the next try hits a warmer instance.
 */
export const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Total time to spend retrying before surfacing an error — the Linux
 * load-balancer idle timeout (the longer of the two platform limits), so we
 * never give up before the platform itself would.
 */
export const COLD_START_BUDGET_MS = 240_000;

/** Pause between attempts. */
export const RETRY_BACKOFF_MS = 3_000;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `fetch` with `REQUEST_TIMEOUT_MS` abort protection. */
export async function fetchWithTimeout(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Runs `attempt` repeatedly until it resolves or `COLD_START_BUDGET_MS` has
 * elapsed since the first try, pausing `RETRY_BACKOFF_MS` between tries.
 * Re-throws the last error once the budget is spent.
 *
 * Reports itself to the shared `apiWake` signal for the whole run — every
 * caller of this function (public reads and the admin console's own
 * `getXFresh()` reads alike) drives the same "is the backend waking up?"
 * indicator, so the admin console's wake banner doesn't need its own tracking.
 */
export async function retryThroughColdStart<T>(
  attempt: () => Promise<T>
): Promise<T> {
  const settle = trackApiRequest();
  try {
    const deadline = Date.now() + COLD_START_BUDGET_MS;
    let lastError: unknown;
    for (;;) {
      try {
        return await attempt();
      } catch (err) {
        lastError = err;
        if (Date.now() + RETRY_BACKOFF_MS >= deadline) break;
        await delay(RETRY_BACKOFF_MS);
      }
    }
    throw lastError;
  } finally {
    settle();
  }
}
