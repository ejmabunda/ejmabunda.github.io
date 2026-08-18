export interface ProfileApiData {
  id: number;
  title: string;
  headline: string;
  subtitle: string;
}

const PROFILE_API_URL =
  "https://ejmabunda-web-api-dfg5bzfbh2c8e3h5.southafricanorth-01.azurewebsites.net/api/profile";

const REQUEST_TIMEOUT_MS = 10_000;
// The backing DB is a serverless tier that suspends after inactivity, so the
// first request after a quiet period can hang or time out while it wakes —
// retrying after a short wait reliably succeeds.
const RETRY_DELAYS_MS = [3_000, 5_000];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchOnce(): Promise<ProfileApiData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(PROFILE_API_URL, { signal: controller.signal });
    // The profile is a DB singleton; a missing row is "no data", not an
    // error, and retrying won't change that.
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Profile API responded with ${res.status}`);
    return (await res.json()) as ProfileApiData;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(): Promise<ProfileApiData | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetchOnce();
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
    cachedProfile = fetchWithRetry().catch((err) => {
      // Don't cache a permanent failure — let a later call try again.
      cachedProfile = null;
      throw err;
    });
  }
  return cachedProfile;
}

export function __resetProfileCacheForTests() {
  cachedProfile = null;
}
