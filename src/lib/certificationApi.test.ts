import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetCertificationCacheForTests,
  createCertification,
  deleteCertification,
  getCertifications,
  getCertificationsFresh,
  updateCertification,
  UnauthorizedError,
  type Certification,
} from "./certificationApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const sample: Certification[] = [
  {
    id: "c1",
    name: "AZ-204",
    issuingOrganization: "Microsoft",
    issueDate: "2024-05-01T00:00:00",
    url: "https://learn.microsoft.com/credentials/az-204",
    skills: [],
  },
];

describe("certificationApi", () => {
  beforeEach(() => {
    __resetCertificationCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches once and caches the result for subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getCertifications()).toEqual(sample);
    expect(await getCertifications()).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries with backoff after a failure and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getCertifications();
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await resultPromise).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("getCertificationsFresh bypasses the cache used by getCertifications", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    await getCertifications();
    await getCertificationsFresh();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("createCertification", () => {
    it("posts the input as JSON and returns the created entry", async () => {
      const created = sample[0];
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, created));
      vi.stubGlobal("fetch", fetchMock);

      const result = await createCertification("token-abc", {
        name: "AZ-204",
        issuingOrganization: "Microsoft",
        issueDate: "2024-05-01",
        url: "https://learn.microsoft.com/credentials/az-204",
        skillIds: [],
      });

      expect(result).toEqual(created);
      const [, init] = fetchMock.mock.calls[0];
      expect(init).toMatchObject({ method: "POST" });
      expect(init.headers.Authorization).toBe("Bearer token-abc");
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        createCertification("expired", {
          name: "x",
          issuingOrganization: "y",
          issueDate: "2024-01-01",
          url: "z",
          skillIds: [],
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("updateCertification", () => {
    it("puts to /{id} with the changed fields", async () => {
      const updated = { ...sample[0], name: "AZ-204 (renewed)" };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateCertification("token-abc", "c1", {
        name: "AZ-204 (renewed)",
      });

      expect(result).toEqual(updated);
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Certification\/c1$/);
    });
  });

  describe("deleteCertification", () => {
    it("treats 404 as already-deleted rather than an error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));
      await expect(
        deleteCertification("token-abc", "gone")
      ).resolves.toBeUndefined();
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));
      await expect(deleteCertification("expired", "c1")).rejects.toThrow(
        UnauthorizedError
      );
    });
  });
});
