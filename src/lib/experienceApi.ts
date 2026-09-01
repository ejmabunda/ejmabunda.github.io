import { API_BASE_URL } from "./config";
import { UnauthorizedError } from "./apiErrors";
import type { Skill } from "./skillApi";

export { UnauthorizedError };

export interface Experience {
  id: string;
  jobTitle: string;
  employer: string;
  /** Calendar date, serialized as `"2026-02-02T00:00:00"` with no zone. */
  startDate: string;
  /** `null` = ongoing role. */
  endDate: string | null;
  /** Newline-separated; one bullet per line. */
  description: string;
  /** Same `SkillDto` shape as `GET /api/Skill`. */
  skills: Skill[];
}

export interface ExperienceCreateInput {
  jobTitle: string;
  employer: string;
  /** ISO date or datetime. */
  startDate: string;
  endDate: string | null;
  /** Newline-separated bullets. */
  description: string;
  /** GUIDs that must exist in `GET /api/Skill`; may be empty. */
  skillIds: string[];
}

const EXPERIENCE_ENDPOINT = () => `${API_BASE_URL}/api/Experience`;

const REQUEST_TIMEOUT_MS = 10_000;
// Same cold-start story as the skill and profile endpoints: the backing DB is a
// serverless tier that suspends after inactivity, so the first request after a
// quiet period can hang or time out while it wakes — a short wait then a retry
// recovers.
const RETRY_DELAYS_MS = [3_000, 5_000];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchExperiencesOnce(): Promise<Experience[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(EXPERIENCE_ENDPOINT(), { signal: controller.signal });
    if (!res.ok) throw new Error(`Experience API responded with ${res.status}`);
    // The list endpoint returns `[]` (not a 404) when there are no experiences.
    return (await res.json()) as Experience[];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchExperiencesWithRetry(): Promise<Experience[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetchExperiencesOnce();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
}

let cachedExperiences: Promise<Experience[]> | null = null;

/**
 * Fetches the experience list, retrying through cold starts. Cached for the
 * page's lifetime so the cold-start cost is paid at most once per visit.
 */
export function getExperiences(): Promise<Experience[]> {
  if (!cachedExperiences) {
    cachedExperiences = fetchExperiencesWithRetry().catch((err) => {
      // Don't cache a permanent failure — let a later call try again.
      cachedExperiences = null;
      throw err;
    });
  }
  return cachedExperiences;
}

/**
 * Same as getExperiences, but bypasses the cache — the admin dashboard needs the
 * current list on every visit (including right after a create).
 */
export function getExperiencesFresh(): Promise<Experience[]> {
  return fetchExperiencesWithRetry();
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createExperience(
  token: string,
  input: ExperienceCreateInput
): Promise<Experience> {
  const res = await fetch(EXPERIENCE_ENDPOINT(), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  // A bad skill id comes back as a plain-text 400 ("Incorrect SkillId
  // provided."); a missing field as JSON ValidationProblemDetails. Either way
  // the caller only needs "the create failed".
  if (!res.ok) throw new Error(`Create experience failed with ${res.status}`);
  return (await res.json()) as Experience;
}

export function __resetExperienceCacheForTests() {
  cachedExperiences = null;
}
