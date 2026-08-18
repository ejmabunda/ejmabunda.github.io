import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetProfileCacheForTests,
  getProfile,
  type ProfileApiData,
} from "./profileApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const sampleProfile: ProfileApiData = {
  id: 1,
  title: "Matimu Mabunda",
  headline: "Software Developer",
  subtitle: "Bio text.",
};

describe("profileApi", () => {
  beforeEach(() => {
    __resetProfileCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches once and caches the result for subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sampleProfile));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getProfile();
    const second = await getProfile();

    expect(first).toEqual(sampleProfile);
    expect(second).toEqual(sampleProfile);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a 404 as no data, without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProfile();

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries with backoff after a failure and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(200, sampleProfile));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getProfile();
    await vi.advanceTimersByTimeAsync(3_000);
    const result = await resultPromise;

    expect(result).toEqual(sampleProfile);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries, and lets a later call retry fresh", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getProfile();
    const expectation = expect(resultPromise).rejects.toThrow("network error");
    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(5_000);
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockResolvedValue(jsonResponse(200, sampleProfile));
    const retryResult = await getProfile();

    expect(retryResult).toEqual(sampleProfile);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
