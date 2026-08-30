import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InvalidPasswordError,
  login,
  logout,
  refreshAccessToken,
} from "./authApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const tokenBody = { token: { accessToken: "eyJ.test", expiresIn: 60 } };

describe("authApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("login", () => {
    it("returns the access token on success", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, tokenBody));
      vi.stubGlobal("fetch", fetchMock);

      const token = await login("correct-password");

      expect(token).toBe("eyJ.test");
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Auth\/login$/);
      expect(init).toMatchObject({ method: "POST", credentials: "include" });
      expect(JSON.parse(init.body)).toEqual({ password: "correct-password" });
    });

    it("throws InvalidPasswordError on 401", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401));
      vi.stubGlobal("fetch", fetchMock);

      await expect(login("wrong-password")).rejects.toThrow(InvalidPasswordError);
    });

    it("throws a generic error on other failures", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500));
      vi.stubGlobal("fetch", fetchMock);

      await expect(login("whatever")).rejects.toThrow("Login failed with 500");
    });
  });

  describe("refreshAccessToken", () => {
    it("returns a fresh access token on success", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, tokenBody));
      vi.stubGlobal("fetch", fetchMock);

      const token = await refreshAccessToken();

      expect(token).toBe("eyJ.test");
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Auth\/refresh$/);
      expect(init).toMatchObject({ method: "POST", credentials: "include" });
    });

    it("returns null when there is no usable session (401)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

      await expect(refreshAccessToken()).resolves.toBeNull();
    });

    it("returns null on 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404)));

      await expect(refreshAccessToken()).resolves.toBeNull();
    });

    it("throws on unexpected failures", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500)));

      await expect(refreshAccessToken()).rejects.toThrow(
        "Token refresh failed with 500"
      );
    });
  });

  describe("logout", () => {
    it("posts to the logout endpoint with credentials", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
      vi.stubGlobal("fetch", fetchMock);

      await logout();

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Auth\/logout$/);
      expect(init).toMatchObject({ method: "POST", credentials: "include" });
    });

    it("resolves even when the request fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

      await expect(logout()).resolves.toBeUndefined();
    });
  });
});
