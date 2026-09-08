import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COLD_START_BUDGET_MS,
  REQUEST_TIMEOUT_MS,
  fetchWithTimeout,
  retryThroughColdStart,
} from "./coldStartRetry";

describe("coldStartRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits out most of a real cold start (budget is at least the platform limit)", () => {
    expect(COLD_START_BUDGET_MS).toBeGreaterThanOrEqual(230_000);
  });

  describe("retryThroughColdStart", () => {
    it("returns the first success without waiting", async () => {
      const attempt = vi.fn().mockResolvedValue("ok");
      await expect(retryThroughColdStart(attempt)).resolves.toBe("ok");
      expect(attempt).toHaveBeenCalledTimes(1);
    });

    it("retries a failing attempt until it succeeds", async () => {
      const attempt = vi
        .fn()
        .mockRejectedValueOnce(new Error("cold"))
        .mockRejectedValueOnce(new Error("cold"))
        .mockResolvedValueOnce("warm");

      const promise = retryThroughColdStart(attempt);
      await vi.advanceTimersByTimeAsync(10_000);

      await expect(promise).resolves.toBe("warm");
      expect(attempt).toHaveBeenCalledTimes(3);
    });

    it("keeps trying for the whole budget before rethrowing the last error", async () => {
      const attempt = vi.fn().mockRejectedValue(new Error("still cold"));

      const promise = retryThroughColdStart(attempt);
      const settled = expect(promise).rejects.toThrow("still cold");
      await vi.advanceTimersByTimeAsync(COLD_START_BUDGET_MS);
      await settled;

      // The old policy stopped at 3 tries; this one should be far higher.
      expect(attempt.mock.calls.length).toBeGreaterThan(10);
    });
  });

  describe("fetchWithTimeout", () => {
    it("aborts a request that outlasts REQUEST_TIMEOUT_MS", async () => {
      let abortSignal: AbortSignal | undefined;
      vi.stubGlobal(
        "fetch",
        vi.fn((_url: string, init?: RequestInit) => {
          abortSignal = init?.signal ?? undefined;
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError"))
            );
          });
        })
      );

      const promise = fetchWithTimeout("https://example.test/api");
      const settled = expect(promise).rejects.toThrow(/abort/i);
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      await settled;

      expect(abortSignal?.aborted).toBe(true);
    });
  });
});
