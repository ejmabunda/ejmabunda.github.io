import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredToken,
  getStoredToken,
  InvalidPasswordError,
  login,
  setStoredToken,
} from "./authApi";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

describe("authApi", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("login", () => {
    it("returns the access token on success", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(200, { token: { accessToken: "eyJ.test", expiresIn: 600 } })
      );
      vi.stubGlobal("fetch", fetchMock);

      const token = await login("correct-password");

      expect(token).toBe("eyJ.test");
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/Login$/);
      expect(init).toMatchObject({ method: "POST" });
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

  describe("token storage", () => {
    it("round-trips through sessionStorage", () => {
      expect(getStoredToken()).toBeNull();

      setStoredToken("eyJ.stored");
      expect(getStoredToken()).toBe("eyJ.stored");

      clearStoredToken();
      expect(getStoredToken()).toBeNull();
    });
  });
});
