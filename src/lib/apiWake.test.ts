import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetApiWakeForTests,
  isApiWaking,
  subscribeApiWake,
  trackApiRequest,
} from "./apiWake";

describe("apiWake", () => {
  beforeEach(() => {
    __resetApiWakeForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not report waking before the threshold", () => {
    trackApiRequest();
    vi.advanceTimersByTime(2_999);
    expect(isApiWaking()).toBe(false);
  });

  it("reports waking once a request has been pending past the threshold", () => {
    trackApiRequest();
    vi.advanceTimersByTime(3_000);
    expect(isApiWaking()).toBe(true);
  });

  it("stays quiet when the request settles before the threshold", () => {
    const settle = trackApiRequest();
    vi.advanceTimersByTime(1_500);
    settle();
    vi.advanceTimersByTime(5_000);
    expect(isApiWaking()).toBe(false);
  });

  it("clears only once every tracked request has settled", () => {
    const settleA = trackApiRequest();
    const settleB = trackApiRequest();
    vi.advanceTimersByTime(3_000);
    expect(isApiWaking()).toBe(true);

    settleA();
    expect(isApiWaking()).toBe(true);

    settleB();
    expect(isApiWaking()).toBe(false);
  });

  it("notifies subscribers entering and leaving the waking state, and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeApiWake(listener);

    const settle = trackApiRequest();
    vi.advanceTimersByTime(3_000);
    expect(listener).toHaveBeenCalledTimes(1);

    settle();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    const settleAgain = trackApiRequest();
    vi.advanceTimersByTime(3_000);
    settleAgain();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("treats a repeated settle call as a no-op", () => {
    const settleA = trackApiRequest();
    const settleB = trackApiRequest();
    vi.advanceTimersByTime(3_000);

    settleA();
    settleA();
    expect(isApiWaking()).toBe(true);

    settleB();
    expect(isApiWaking()).toBe(false);
  });
});
