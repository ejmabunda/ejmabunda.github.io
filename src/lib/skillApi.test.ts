import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetSkillCacheForTests,
  createSkill,
  deleteSkill,
  getSkills,
  getSkillsFresh,
  updateSkill,
  UnauthorizedError,
  SKILL_CATEGORY,
  type Skill,
} from "./skillApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const sampleSkills: Skill[] = [
  { id: "a", name: "GitHub", skillCategory: "Platform" },
  { id: "b", name: "PostgreSQL", skillCategory: "SystemsAndData" },
];

describe("skillApi", () => {
  beforeEach(() => {
    __resetSkillCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches once and caches the result for subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sampleSkills));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getSkills()).toEqual(sampleSkills);
    expect(await getSkills()).toEqual(sampleSkills);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array unchanged (no skills is not an error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

    expect(await getSkills()).toEqual([]);
  });

  it("retries with backoff after a failure and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(200, sampleSkills));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getSkills();
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await resultPromise).toEqual(sampleSkills);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries, and lets a later call retry fresh", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getSkills();
    const expectation = expect(resultPromise).rejects.toThrow("network error");
    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(5_000);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockResolvedValue(jsonResponse(200, sampleSkills));
    expect(await getSkills()).toEqual(sampleSkills);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("getSkillsFresh bypasses the cache used by getSkills", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sampleSkills));
    vi.stubGlobal("fetch", fetchMock);

    await getSkills();
    await getSkillsFresh();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("createSkill", () => {
    it("posts the category as its integer and returns the created skill", async () => {
      const created: Skill = { id: "c", name: "GitHub", skillCategory: "Platform" };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, created));
      vi.stubGlobal("fetch", fetchMock);

      const result = await createSkill("token-abc", {
        name: "GitHub",
        skillCategory: SKILL_CATEGORY.Platform,
      });

      expect(result).toEqual(created);
      const [, init] = fetchMock.mock.calls[0];
      expect(init).toMatchObject({ method: "POST" });
      expect(init.headers.Authorization).toBe("Bearer token-abc");
      expect(JSON.parse(init.body)).toEqual({ name: "GitHub", skillCategory: 2 });
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        createSkill("expired", { name: "x", skillCategory: 0 })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws a generic error on other failures", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400)));

      await expect(
        createSkill("token", { name: "x", skillCategory: 0 })
      ).rejects.toThrow("Create skill failed with 400");
    });
  });

  describe("updateSkill", () => {
    it("puts the id and changed fields in the body", async () => {
      const updated: Skill = {
        id: "a",
        name: "GitHub",
        skillCategory: "CloudAndDevOps",
      };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateSkill("token-abc", {
        id: "a",
        skillCategory: SKILL_CATEGORY.CloudAndDevOps,
      });

      expect(result).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Skill$/);
      expect(init).toMatchObject({ method: "PUT" });
      expect(JSON.parse(init.body)).toEqual({ id: "a", skillCategory: 4 });
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(updateSkill("expired", { id: "a" })).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe("deleteSkill", () => {
    it("sends the id in the route and resolves on 204", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(204));
      vi.stubGlobal("fetch", fetchMock);

      await expect(deleteSkill("token-abc", "a")).resolves.toBeUndefined();
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/Skill\/a$/);
    });

    it("treats 404 as already-deleted rather than an error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));

      await expect(deleteSkill("token-abc", "gone")).resolves.toBeUndefined();
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(deleteSkill("expired", "a")).rejects.toThrow(UnauthorizedError);
    });

    it("throws a generic error on other failures", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500)));

      await expect(deleteSkill("token-abc", "a")).rejects.toThrow(
        "Delete skill failed with 500"
      );
    });
  });
});
