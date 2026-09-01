import { API_BASE_URL } from "./config";
import { UnauthorizedError } from "./apiErrors";

export { UnauthorizedError };

export interface ProfileApiData {
  id: number;
  title: string;
  headline: string;
  subtitle: string;
}

export interface ProfileInput {
  title: string;
  headline: string;
  subtitle: string;
}

const PROFILE_ENDPOINT = () => `${API_BASE_URL}/api/Profile`;

const REQUEST_TIMEOUT_MS = 10_000;
// The backing DB is a serverless tier that suspends after inactivity, so the
// first request after a quiet period can hang or time out while it wakes —
// retrying after a short wait reliably succeeds.
const RETRY_DELAYS_MS = [3_000, 5_000];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchProfileOnce(): Promise<ProfileApiData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(PROFILE_ENDPOINT(), { signal: controller.signal });
    // The profile is a DB singleton; a missing row is "no data", not an
    // error, and retrying won't change that.
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Profile API responded with ${res.status}`);
    return (await res.json()) as ProfileApiData;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchProfileWithRetry(): Promise<ProfileApiData | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetchProfileOnce();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
}

let cachedProfile: Promise<ProfileApiData | null> | null = null;

/**
 * Fetches the profile, retrying through cold starts. The result is cached
 * for the page's lifetime so the cold-start cost is paid at most once per
 * visit rather than on every return to the profile section.
 */
export function getProfile(): Promise<ProfileApiData | null> {
  if (!cachedProfile) {
    cachedProfile = fetchProfileWithRetry().catch((err) => {
      // Don't cache a permanent failure — let a later call try again.
      cachedProfile = null;
      throw err;
    });
  }
  return cachedProfile;
}

/**
 * Same as getProfile, but bypasses the cache — the admin dashboard needs the
 * current record on every visit (including right after a create/delete),
 * not the value from whenever the public page first loaded it.
 */
export function getProfileFresh(): Promise<ProfileApiData | null> {
  return fetchProfileWithRetry();
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createProfile(
  token: string,
  input: ProfileInput
): Promise<ProfileApiData> {
  const res = await fetch(PROFILE_ENDPOINT(), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Create profile failed with ${res.status}`);
  return (await res.json()) as ProfileApiData;
}

export async function updateProfile(
  token: string,
  input: Partial<ProfileInput>
): Promise<ProfileApiData> {
  const res = await fetch(PROFILE_ENDPOINT(), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Update profile failed with ${res.status}`);
  return (await res.json()) as ProfileApiData;
}

export async function deleteProfile(token: string): Promise<void> {
  const res = await fetch(PROFILE_ENDPOINT(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError();
  // A 404 means there's already nothing to delete — that's the caller's
  // goal state, not a failure.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete profile failed with ${res.status}`);
  }
}

export function __resetProfileCacheForTests() {
  cachedProfile = null;
}
