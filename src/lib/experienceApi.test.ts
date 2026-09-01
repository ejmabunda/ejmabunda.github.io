import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetExperienceCacheForTests,
  createExperience,
  getExperiences,
  getExperiencesFresh,
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

  it("gives up after exhausting retries, and lets a later call retry fresh", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getExperiences();
    const expectation = expect(resultPromise).rejects.toThrow("network error");
    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(5_000);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockResolvedValue(jsonResponse(200, sample));
    expect(await getExperiences()).toEqual(sample);
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
});
