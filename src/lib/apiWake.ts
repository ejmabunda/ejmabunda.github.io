/**
 * Shared "is the backend cold-starting?" signal.
 *
 * The API is hosted on a free App Service tier that suspends after inactivity,
 * so the first request after a quiet period can take tens of seconds while the
 * instance spins back up. Each data hook wraps its request in
 * `trackApiRequest()`; once any tracked request has been in flight longer than
 * `WAKE_AFTER_MS`, `isApiWaking()` flips to `true` and subscribers are notified
 * so the UI can explain the wait. It flips back to `false` as soon as every
 * tracked request has settled.
 */

const WAKE_AFTER_MS = 3_000;

type Listener = () => void;

let activeRequests = 0;
let waking = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

function setWaking(next: boolean) {
  if (waking === next) return;
  waking = next;
  notify();
}

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * Marks a slow-capable request as started. Returns a function to call when it
 * settles (resolve or reject) — safe to call more than once.
 */
export function trackApiRequest(): () => void {
  activeRequests += 1;
  if (activeRequests === 1 && timer === null) {
    timer = setTimeout(() => {
      timer = null;
      if (activeRequests > 0) setWaking(true);
    }, WAKE_AFTER_MS);
  }

  let settled = false;
  return () => {
    if (settled) return;
    settled = true;
    activeRequests -= 1;
    if (activeRequests === 0) {
      clearTimer();
      setWaking(false);
    }
  };
}

export function isApiWaking(): boolean {
  return waking;
}

export function subscribeApiWake(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function __resetApiWakeForTests(): void {
  activeRequests = 0;
  waking = false;
  clearTimer();
  listeners.clear();
}
