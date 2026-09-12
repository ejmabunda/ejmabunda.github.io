import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetQualificationCacheForTests,
  createQualification,
  deleteQualification,
  getQualifications,
  getQualificationsFresh,
  isKnownNqfLevel,
  NQF_LEVEL,
  NQF_LEVEL_LABEL,
  NQF_LEVEL_NAMES,
  updateQualification,
  UnauthorizedError,
  type Qualification,
} from "./qualificationApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const sample: Qualification[] = [
  {
    id: "q1",
    name: "BSc Computer Science",
    institution: "University of Johannesburg",
    startDate: "2020-01-01T00:00:00",
    endDate: "2022-12-01T00:00:00",
    nqfLevel: "Nqf7",
    skills: [],
  },
];

describe("qualificationApi enum map", () => {
  it("spans the full 1-10 NQF ladder in ascending order", () => {
    expect(NQF_LEVEL_NAMES.map((name) => NQF_LEVEL[name])).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(NQF_LEVEL_NAMES.every((name) => NQF_LEVEL_LABEL[name])).toBe(true);
  });

  it("isKnownNqfLevel recognises valid and rejects unknown names", () => {
    expect(isKnownNqfLevel("Nqf8")).toBe(true);
    expect(isKnownNqfLevel("Nqf99")).toBe(false);
  });
});

describe("qualificationApi", () => {
  beforeEach(() => {
    __resetQualificationCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches once and caches the result for subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getQualifications()).toEqual(sample);
    expect(await getQualifications()).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries with backoff after a failure and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getQualifications();
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await resultPromise).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resolves to an empty array on 404 without retrying (no controller yet)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getQualifications()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("getQualificationsFresh bypasses the cache used by getQualifications", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    await getQualifications();
    await getQualificationsFresh();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("createQualification", () => {
    it("posts the nqfLevel as an int and returns the created entry", async () => {
      const created = sample[0];
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, created));
      vi.stubGlobal("fetch", fetchMock);

      const result = await createQualification("token-abc", {
        name: "BSc Computer Science",
        institution: "University of Johannesburg",
        startDate: "2020-01-01",
        endDate: "2022-12-01",
        nqfLevel: NQF_LEVEL.Nqf7,
        skillIds: [],
      });

      expect(result).toEqual(created);
      const [, init] = fetchMock.mock.calls[0];
      expect(init).toMatchObject({ method: "POST" });
      expect(JSON.parse(init.body).nqfLevel).toBe(7);
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        createQualification("expired", {
          name: "x",
          institution: "y",
          startDate: "2020-01-01",
          endDate: null,
          nqfLevel: 7,
          skillIds: [],
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("updateQualification", () => {
    it("puts to /{id} with the changed fields", async () => {
      const updated = { ...sample[0], nqfLevel: "Nqf8" as const };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateQualification("token-abc", "q1", {
        nqfLevel: 8,
      });

      expect(result).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Qualification\/q1$/);
      expect(JSON.parse(init.body)).toEqual({ nqfLevel: 8 });
    });
  });

  describe("deleteQualification", () => {
    it("treats 404 as already-deleted rather than an error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));
      await expect(
        deleteQualification("token-abc", "gone")
      ).resolves.toBeUndefined();
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));
      await expect(deleteQualification("expired", "q1")).rejects.toThrow(
        UnauthorizedError
      );
    });
  });
});
