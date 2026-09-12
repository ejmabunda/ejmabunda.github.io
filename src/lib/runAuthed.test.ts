import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "./apiErrors";

const refreshAccessToken = vi.fn();
vi.mock("./authApi", () => ({
  refreshAccessToken: (...args: unknown[]) => refreshAccessToken(...args),
}));

const { runAuthed } = await import("./runAuthed");

describe("runAuthed", () => {
  it("returns the call's result without touching refresh on success", async () => {
    const call = vi.fn().mockResolvedValue("ok");
    const onTokenRefreshed = vi.fn();

    await expect(runAuthed("tok", onTokenRefreshed, call)).resolves.toBe("ok");
    expect(call).toHaveBeenCalledWith("tok");
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(onTokenRefreshed).not.toHaveBeenCalled();
  });

  it("propagates a non-auth error without refreshing", async () => {
    const call = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(runAuthed("tok", vi.fn(), call)).rejects.toThrow("boom");
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("on 401, refreshes once, reports the fresh token, and retries", async () => {
    refreshAccessToken.mockResolvedValueOnce("fresh-tok");
    const call = vi
      .fn()
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce("ok-after-refresh");
    const onTokenRefreshed = vi.fn();

    await expect(runAuthed("stale", onTokenRefreshed, call)).resolves.toBe(
      "ok-after-refresh"
    );
    expect(call).toHaveBeenNthCalledWith(1, "stale");
    expect(call).toHaveBeenNthCalledWith(2, "fresh-tok");
    expect(onTokenRefreshed).toHaveBeenCalledWith("fresh-tok");
  });

  it("rethrows the original 401 when the refresh cookie is unusable", async () => {
    refreshAccessToken.mockResolvedValueOnce(null);
    const call = vi.fn().mockRejectedValue(new UnauthorizedError());

    await expect(runAuthed("stale", vi.fn(), call)).rejects.toThrow(
      UnauthorizedError
    );
    expect(call).toHaveBeenCalledTimes(1);
  });
});
