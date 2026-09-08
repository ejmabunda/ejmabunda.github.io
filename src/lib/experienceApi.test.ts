import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetExperienceCacheForTests,
  createExperience,
  deleteExperience,
  getExperiences,
  getExperiencesFresh,
  updateExperience,
  UnauthorizedError,
  type Experience,
} from "./experienceApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const sample: Experience[] = [
  {
    id: "a",
    jobTitle: "Software Developer",
    employer: "Xiquel",
    startDate: "2026-02-02T00:00:00",
    endDate: null,
    description: "line one\nline two",
    skills: [{ id: "s1", name: "C#", skillCategory: "LanguagesAndBackend" }],
  },
];

describe("experienceApi", () => {
  beforeEach(() => {
    __resetExperienceCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches once and caches the result for subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getExperiences()).toEqual(sample);
    expect(await getExperiences()).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array unchanged (no experiences is not an error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));
    expect(await getExperiences()).toEqual([]);
  });

  it("retries with backoff after a failure and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getExperiences();
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await resultPromise).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps retrying across the cold-start window, then gives up and lets a later call retry fresh", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getExperiences();
    const expectation = expect(resultPromise).rejects.toThrow("network error");
    await vi.advanceTimersByTimeAsync(240_000);
    await expectation;

    expect(fetchMock.mock.calls.length).toBeGreaterThan(10);
    const callsWhileFailing = fetchMock.mock.calls.length;

    fetchMock.mockResolvedValue(jsonResponse(200, sample));
    expect(await getExperiences()).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(callsWhileFailing + 1);
  });

  it("getExperiencesFresh bypasses the cache used by getExperiences", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    await getExperiences();
    await getExperiencesFresh();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("createExperience", () => {
    it("posts the input as JSON with a bearer token and returns the created entry", async () => {
      const created = sample[0];
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, created));
      vi.stubGlobal("fetch", fetchMock);

      const result = await createExperience("token-abc", {
        jobTitle: "Software Developer",
        employer: "Xiquel",
        startDate: "2026-02-02",
        endDate: null,
        description: "line one\nline two",
        skillIds: ["s1"],
      });

      expect(result).toEqual(created);
      const [, init] = fetchMock.mock.calls[0];
      expect(init).toMatchObject({ method: "POST" });
      expect(init.headers.Authorization).toBe("Bearer token-abc");
      expect(JSON.parse(init.body)).toEqual({
        jobTitle: "Software Developer",
        employer: "Xiquel",
        startDate: "2026-02-02",
        endDate: null,
        description: "line one\nline two",
        skillIds: ["s1"],
      });
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        createExperience("expired", {
          jobTitle: "x",
          employer: "y",
          startDate: "2026-01-01",
          endDate: null,
          description: "z",
          skillIds: [],
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws a generic error on other failures (e.g. a bad skill id)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400)));

      await expect(
        createExperience("token", {
          jobTitle: "x",
          employer: "y",
          startDate: "2026-01-01",
          endDate: null,
          description: "z",
          skillIds: ["missing"],
        })
      ).rejects.toThrow("Create experience failed with 400");
    });
  });

  describe("updateExperience", () => {
    it("puts to /{id} with the changed fields and returns the updated entry", async () => {
      const updated = { ...sample[0], jobTitle: "Senior Developer" };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateExperience("token-abc", "a", {
        jobTitle: "Senior Developer",
        skillIds: ["s1", "s2"],
      });

      expect(result).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Experience\/a$/);
      expect(init).toMatchObject({ method: "PUT" });
      expect(init.headers.Authorization).toBe("Bearer token-abc");
      expect(JSON.parse(init.body)).toEqual({
        jobTitle: "Senior Developer",
        skillIds: ["s1", "s2"],
      });
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        updateExperience("expired", "a", { jobTitle: "x" })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws a generic error on other failures", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));

      await expect(
        updateExperience("token", "gone", { jobTitle: "x" })
      ).rejects.toThrow("Update experience failed with 404");
    });
  });

  describe("deleteExperience", () => {
    it("sends the id in the route and resolves on 204", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(204));
      vi.stubGlobal("fetch", fetchMock);

      await expect(deleteExperience("token-abc", "a")).resolves.toBeUndefined();
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Experience\/a$/);
      expect(init).toMatchObject({ method: "DELETE" });
    });

    it("treats 404 as already-deleted rather than an error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));

      await expect(deleteExperience("token-abc", "gone")).resolves.toBeUndefined();
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(deleteExperience("expired", "a")).rejects.toThrow(
        UnauthorizedError
      );
    });

    it("throws a generic error on other failures", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500)));

      await expect(deleteExperience("token-abc", "a")).rejects.toThrow(
        "Delete experience failed with 500"
      );
    });
  });
});
