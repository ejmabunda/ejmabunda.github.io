import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetProfileCacheForTests,
  createProfile,
  deleteProfile,
  getProfile,
  getProfileFresh,
  UnauthorizedError,
  updateProfile,
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

  it("getProfileFresh bypasses the cache used by getProfile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sampleProfile));
    vi.stubGlobal("fetch", fetchMock);

    await getProfile();
    await getProfileFresh();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("createProfile", () => {
    it("posts the input and returns the created profile", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, sampleProfile));
      vi.stubGlobal("fetch", fetchMock);

      const input = { title: "t", headline: "h", subtitle: "s" };
      const result = await createProfile("token-abc", input);

      expect(result).toEqual(sampleProfile);
      const [, init] = fetchMock.mock.calls[0];
      expect(init).toMatchObject({ method: "POST" });
      expect(init.headers.Authorization).toBe("Bearer token-abc");
      expect(JSON.parse(init.body)).toEqual(input);
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        createProfile("expired", { title: "t", headline: "h", subtitle: "s" })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("updateProfile", () => {
    it("puts the input and returns the updated profile", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sampleProfile));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateProfile("token-abc", { title: "new title" });

      expect(result).toEqual(sampleProfile);
      const [, init] = fetchMock.mock.calls[0];
      expect(init).toMatchObject({ method: "PUT" });
      expect(JSON.parse(init.body)).toEqual({ title: "new title" });
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(updateProfile("expired", { title: "x" })).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe("deleteProfile", () => {
    it("resolves on 204", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(204)));

      await expect(deleteProfile("token-abc")).resolves.toBeUndefined();
    });

    it("treats 404 as already-deleted rather than an error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));

      await expect(deleteProfile("token-abc")).resolves.toBeUndefined();
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(deleteProfile("expired")).rejects.toThrow(UnauthorizedError);
    });

    it("throws a generic error on other failures", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500)));

      await expect(deleteProfile("token-abc")).rejects.toThrow(
        "Delete profile failed with 500"
      );
    });
  });
});
