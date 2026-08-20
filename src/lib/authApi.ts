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
  const res = await fetch(`${API_BASE_URL}/api/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (res.status === 401) throw new InvalidPasswordError();
  if (!res.ok) throw new Error(`Login failed with ${res.status}`);
  const data = (await res.json()) as LoginResponse;
  return data.token.accessToken;
}

const TOKEN_STORAGE_KEY = "admin-token";

// Session-scoped (not localStorage): tokens live 10 minutes and are
// invalidated on every backend redeploy anyway, so there's no benefit to
// persisting them past the browser tab closing.
export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}
