import { API_BASE_URL } from "./config";

export class InvalidPasswordError extends Error {
  constructor() {
    super("Invalid password");
    this.name = "InvalidPasswordError";
  }
}

interface LoginResponse {
  token: {
    accessToken: string;
    expiresIn: number;
  };
}

export async function login(password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    // The backend sets an HttpOnly refresh-token cookie on this response; the
    // browser only stores it when the request is made with credentials.
    credentials: "include",
  });
  if (res.status === 401) throw new InvalidPasswordError();
  if (!res.ok) throw new Error(`Login failed with ${res.status}`);
  const data = (await res.json()) as LoginResponse;
  return data.token.accessToken;
}

/**
 * Exchanges the HttpOnly refresh-token cookie for a fresh access token, rotating
 * the cookie in the process. Returns null when there is no usable cookie (never
 * logged in, expired, or already rotated/revoked) — the caller should treat that
 * as "logged out" rather than an error.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE_URL}/api/Auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Token refresh failed with ${res.status}`);
  const data = (await res.json()) as LoginResponse;
  return data.token.accessToken;
}

/**
 * Revokes the current session server-side and clears the refresh-token cookie.
 * Best-effort: the frontend drops its own auth state regardless of the outcome,
 * so a network failure here is swallowed.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/Auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore — local state is cleared by the caller either way
  }
}
