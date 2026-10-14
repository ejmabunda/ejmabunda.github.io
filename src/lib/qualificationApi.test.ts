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
  ApiError,
  UnauthorizedError,
  type Qualification,
} from "./qualificationApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

function textResponse(status: number, body: string): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body,
  } as unknown as Response;
}

const sample: Qualification[] = [
  {
    id: "q1",
    name: "BSc Computer Science",
    institution: "University of Johannesburg",
    startDate: "2020-01-01T00:00:00",
    endDate: "2022-12-01T00:00:00",
    nqfLevel: "BachelorsDegree",
    skills: [],
  },
];

describe("qualificationApi enum map", () => {
  it("mirrors the backend's enum NqfLevel names and ints", () => {
    expect(NQF_LEVEL).toEqual({
      Grade9: 1,
      Grade10: 2,
      Grade11: 3,
      Grade12: 4,
      HigherCertificate: 5,
      Diploma: 6,
      BachelorsDegree: 7,
      HonoursDegree: 8,
      MastersDegree: 9,
      DoctoralDegree: 10,
    });
  });

  it("spans the full 1-10 NQF ladder in ascending order", () => {
    expect(NQF_LEVEL_NAMES.map((name) => NQF_LEVEL[name])).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(NQF_LEVEL_NAMES.every((name) => NQF_LEVEL_LABEL[name])).toBe(true);
  });

  it("isKnownNqfLevel recognises valid and rejects unknown names", () => {
    expect(isKnownNqfLevel("Grade12")).toBe(true);
    expect(isKnownNqfLevel("DoctoralDegree")).toBe(true);
    expect(isKnownNqfLevel("Masters")).toBe(false);
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

  it("passes an empty list straight through", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));
    expect(await getQualifications()).toEqual([]);
  });

  it("treats a 404 on the list as a failure, not an empty list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));

    const resultPromise = getQualifications();
    const expectation = expect(resultPromise).rejects.toThrow(
      "Qualification API responded with 404"
    );
    await vi.advanceTimersByTimeAsync(240_000);
    await expectation;
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
        nqfLevel: NQF_LEVEL.BachelorsDegree,
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

    it("surfaces a plain-text 400 body as the error message", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            textResponse(400, "One or more skill ids do not exist.")
          )
      );

      const err = await createQualification("token-abc", {
        name: "x",
        institution: "y",
        startDate: "2020-01-01",
        endDate: null,
        nqfLevel: 7,
        skillIds: ["missing"],
      }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message).toBe(
        "One or more skill ids do not exist."
      );
    });

    it("surfaces the first field error from a ValidationProblemDetails 400", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(400, {
            title: "One or more validation errors occurred.",
            status: 400,
            errors: { Name: ["The Name field is required."] },
          })
        )
      );

      await expect(
        createQualification("token-abc", {
          name: "",
          institution: "y",
          startDate: "2020-01-01",
          endDate: null,
          nqfLevel: 7,
          skillIds: [],
        })
      ).rejects.toThrow("The Name field is required.");
    });
  });

  describe("updateQualification", () => {
    it("puts to /{id} with the changed fields and endDate", async () => {
      const updated = { ...sample[0], nqfLevel: "HonoursDegree" as const };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateQualification("token-abc", "q1", {
        nqfLevel: 8,
        endDate: "2022-12-01",
      });

      expect(result).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Qualification\/q1$/);
      expect(JSON.parse(init.body)).toEqual({
        nqfLevel: 8,
        endDate: "2022-12-01",
      });
    });

    it("surfaces the backend's 404 message", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            textResponse(404, "Qualification does not exist on DB.")
          )
      );
      await expect(
        updateQualification("token-abc", "gone", { endDate: null })
      ).rejects.toThrow("Qualification does not exist on DB.");
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
