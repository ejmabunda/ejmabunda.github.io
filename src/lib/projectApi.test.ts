import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetProjectCacheForTests,
  createProject,
  deleteProject,
  getProjects,
  getProjectsFresh,
  updateProject,
  UnauthorizedError,
  type Project,
} from "./projectApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const sample: Project[] = [
  {
    id: "p1",
    name: "Portfolio site",
    url: "https://ejmabunda.dev",
    skills: [{ id: "s1", name: "TypeScript", skillCategory: "LanguagesAndBackend" }],
  },
];

describe("projectApi", () => {
  beforeEach(() => {
    __resetProjectCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches once and caches the result for subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getProjects()).toEqual(sample);
    expect(await getProjects()).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array unchanged (no projects is not an error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));
    expect(await getProjects()).toEqual([]);
  });

  it("resolves to an empty array on 404 without retrying (no controller yet)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getProjects()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries with backoff after a failure and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getProjects();
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await resultPromise).toEqual(sample);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("getProjectsFresh bypasses the cache used by getProjects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, sample));
    vi.stubGlobal("fetch", fetchMock);

    await getProjects();
    await getProjectsFresh();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("createProject", () => {
    it("posts the input as JSON with a bearer token and returns the created entry", async () => {
      const created = sample[0];
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, created));
      vi.stubGlobal("fetch", fetchMock);

      const result = await createProject("token-abc", {
        name: "Portfolio site",
        url: "https://ejmabunda.dev",
        skillIds: ["s1"],
      });

      expect(result).toEqual(created);
      const [, init] = fetchMock.mock.calls[0];
      expect(init).toMatchObject({ method: "POST" });
      expect(init.headers.Authorization).toBe("Bearer token-abc");
      expect(JSON.parse(init.body)).toEqual({
        name: "Portfolio site",
        url: "https://ejmabunda.dev",
        skillIds: ["s1"],
      });
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        createProject("expired", { name: "x", url: "y", skillIds: [] })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws a generic error on other failures", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400)));

      await expect(
        createProject("token", { name: "x", url: "y", skillIds: ["missing"] })
      ).rejects.toThrow("Create project failed with 400");
    });
  });

  describe("updateProject", () => {
    it("puts to /{id} with the changed fields and returns the updated entry", async () => {
      const updated = { ...sample[0], name: "Portfolio site v2" };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateProject("token-abc", "p1", {
        name: "Portfolio site v2",
      });

      expect(result).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Project\/p1$/);
      expect(init).toMatchObject({ method: "PUT" });
      expect(JSON.parse(init.body)).toEqual({ name: "Portfolio site v2" });
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(
        updateProject("expired", "p1", { name: "x" })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("deleteProject", () => {
    it("sends the id in the route and resolves on 204", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(204));
      vi.stubGlobal("fetch", fetchMock);

      await expect(deleteProject("token-abc", "p1")).resolves.toBeUndefined();
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Project\/p1$/);
      expect(init).toMatchObject({ method: "DELETE" });
    });

    it("treats 404 as already-deleted rather than an error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));
      await expect(deleteProject("token-abc", "gone")).resolves.toBeUndefined();
    });

    it("throws UnauthorizedError on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));
      await expect(deleteProject("expired", "p1")).rejects.toThrow(
        UnauthorizedError
      );
    });
  });
});
