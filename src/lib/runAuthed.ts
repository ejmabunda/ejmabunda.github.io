import { UnauthorizedError } from "./apiErrors";
import { refreshAccessToken } from "./authApi";

/**
 * Runs an authenticated call with the current token; on a 401 it exchanges
 * the refresh cookie for a fresh token once, reports it up via
 * `onTokenRefreshed`, and retries the call — only then propagating the
 * failure so the caller can bounce to the login screen. Post-deploy 401s
 * (the access token outliving a redeploy) are the normal path this exists
 * for, not an edge case.
 */
export async function runAuthed<T>(
  token: string,
  onTokenRefreshed: (token: string) => void,
  call: (token: string) => Promise<T>
): Promise<T> {
  try {
    return await call(token);
  } catch (err) {
    if (!(err instanceof UnauthorizedError)) throw err;
    const fresh = await refreshAccessToken();
    if (!fresh) throw err;
    onTokenRefreshed(fresh);
    return call(fresh);
  }
}
