import { API_BASE_URL } from "./config";
import { UnauthorizedError } from "./apiErrors";
import { fetchWithTimeout, retryThroughColdStart } from "./coldStartRetry";
import type { Skill } from "./skillApi";

export { UnauthorizedError };

/**
 * No `/api/Qualification` controller exists yet — this client is built
 * against the anticipated `Experience`-shaped contract per the console
 * redesign handoff. It will 404 until the backend ships.
 *
 * `nqfLevel` follows the same asymmetric wire format as `Skill.skillCategory`:
 * the backing int on write, the enum name on read. The South African NQF
 * ladder (SAQA) is used for the 1–10 labels; the key names here are
 * provisional and should be reconciled with the backend's real enum names
 * once the controller ships.
 */
export const NQF_LEVEL = {
  Nqf1: 1,
  Nqf2: 2,
  Nqf3: 3,
  Nqf4: 4,
  Nqf5: 5,
  Nqf6: 6,
  Nqf7: 7,
  Nqf8: 8,
  Nqf9: 9,
  Nqf10: 10,
} as const;

export type NqfLevelName = keyof typeof NQF_LEVEL;

/** Level names in ascending (1→10) order. */
export const NQF_LEVEL_NAMES = Object.keys(NQF_LEVEL) as NqfLevelName[];

export const NQF_LEVEL_LABEL: Record<NqfLevelName, string> = {
  Nqf1: "Grade 9",
  Nqf2: "Grade 10",
  Nqf3: "Grade 11",
  Nqf4: "National Senior Certificate",
  Nqf5: "Higher Certificate",
  Nqf6: "Diploma",
  Nqf7: "Bachelor's Degree",
  Nqf8: "Honours Degree",
  Nqf9: "Master's Degree",
  Nqf10: "Doctoral Degree",
};

export function isKnownNqfLevel(value: string): value is NqfLevelName {
  return value in NQF_LEVEL;
}

export interface Qualification {
  id: string;
  name: string;
  institution: string;
  /** Calendar date, serialized as `"2026-02-02T00:00:00"` with no zone. */
  startDate: string;
  /** `null` = in progress. */
  endDate: string | null;
  /** enum NAME on the way out (e.g. "Nqf8") */
  nqfLevel: NqfLevelName;
  /** Same `SkillDto` shape as `GET /api/Skill`. */
  skills: Skill[];
}

export interface QualificationCreateInput {
  name: string;
  institution: string;
  startDate: string;
  endDate: string | null;
  /** enum INT on the way in (1–10) */
  nqfLevel: number;
  skillIds: string[];
}

export interface QualificationUpdateInput {
  name?: string;
  institution?: string;
  startDate?: string;
  endDate?: string | null;
  nqfLevel?: number;
  skillIds?: string[];
}

const QUALIFICATION_ENDPOINT = () => `${API_BASE_URL}/api/Qualification`;

async function fetchQualificationsOnce(): Promise<Qualification[]> {
  const res = await fetchWithTimeout(QUALIFICATION_ENDPOINT());
  // No controller exists yet, so this 404s today — see projectApi's
  // fetchProjectsOnce for why a 404 resolves to [] instead of retrying.
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Qualification API responded with ${res.status}`);
  }
  return (await res.json()) as Qualification[];
}

function fetchQualificationsWithRetry(): Promise<Qualification[]> {
  return retryThroughColdStart(fetchQualificationsOnce);
}

let cachedQualifications: Promise<Qualification[]> | null = null;

/**
 * Fetches the qualification list, retrying through cold starts. Cached for
 * the page's lifetime so the cold-start cost is paid at most once per visit.
 */
export function getQualifications(): Promise<Qualification[]> {
  if (!cachedQualifications) {
    cachedQualifications = fetchQualificationsWithRetry().catch((err) => {
      cachedQualifications = null;
      throw err;
    });
  }
  return cachedQualifications;
}

/** Same as getQualifications, but bypasses the cache — used by the admin console. */
export function getQualificationsFresh(): Promise<Qualification[]> {
  return fetchQualificationsWithRetry();
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createQualification(
  token: string,
  input: QualificationCreateInput
): Promise<Qualification> {
  const res = await fetch(QUALIFICATION_ENDPOINT(), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    throw new Error(`Create qualification failed with ${res.status}`);
  }
  return (await res.json()) as Qualification;
}

export async function updateQualification(
  token: string,
  id: string,
  input: QualificationUpdateInput
): Promise<Qualification> {
  const res = await fetch(`${QUALIFICATION_ENDPOINT()}/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    throw new Error(`Update qualification failed with ${res.status}`);
  }
  return (await res.json()) as Qualification;
}

export async function deleteQualification(
  token: string,
  id: string
): Promise<void> {
  const res = await fetch(`${QUALIFICATION_ENDPOINT()}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete qualification failed with ${res.status}`);
  }
}

export function __resetQualificationCacheForTests() {
  cachedQualifications = null;
}
