import { API_BASE_URL } from "./config";
import { ApiError, readErrorMessage, UnauthorizedError } from "./apiErrors";
import { fetchWithTimeout, retryThroughColdStart } from "./coldStartRetry";
import type { Skill } from "./skillApi";

export { ApiError, UnauthorizedError };

/**
 * `nqfLevel` follows the same asymmetric wire format as `Skill.skillCategory`:
 * the backing int on write, the enum name on read (the backend has no
 * `JsonStringEnumConverter`, so sending a name is a 400). Keys mirror the
 * backend's `enum NqfLevel` in `Models/Qualification.cs`; the labels follow
 * the South African NQF ladder (SAQA).
 */
export const NQF_LEVEL = {
  Grade9: 1,
  Grade10: 2,
  Grade11: 3,
  Grade12: 4,
  HigherCertificate: 5,
  Diploma: 6,
  BachelorsDegree: 7,
  HonoursDegree: 8,
  MastersDegree: 9,
  DoctoralDegree: 10,
} as const;

export type NqfLevelName = keyof typeof NQF_LEVEL;

/** Level names in ascending (1→10) order. */
export const NQF_LEVEL_NAMES = Object.keys(NQF_LEVEL) as NqfLevelName[];

export const NQF_LEVEL_LABEL: Record<NqfLevelName, string> = {
  Grade9: "Grade 9",
  Grade10: "Grade 10",
  Grade11: "Grade 11",
  Grade12: "National Senior Certificate",
  HigherCertificate: "Higher Certificate",
  Diploma: "Diploma",
  BachelorsDegree: "Bachelor's Degree",
  HonoursDegree: "Honours Degree",
  MastersDegree: "Master's Degree",
  DoctoralDegree: "Doctoral Degree",
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
  /** enum NAME on the way out (e.g. "Diploma") */
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

/**
 * Omitted fields are left untouched — except `endDate`, which the backend
 * assigns unconditionally (an omitted one silently becomes `null`, i.e. "in
 * progress"). It's required here so every PUT carries it. `skillIds`: omit to
 * keep the current links, `[]` to clear them, or a list to mirror it exactly.
 */
export interface QualificationUpdateInput {
  name?: string;
  institution?: string;
  startDate?: string;
  endDate: string | null;
  nqfLevel?: number;
  skillIds?: string[];
}

const QUALIFICATION_ENDPOINT = () => `${API_BASE_URL}/api/Qualification`;

async function fetchQualificationsOnce(): Promise<Qualification[]> {
  const res = await fetchWithTimeout(QUALIFICATION_ENDPOINT());
  if (!res.ok) {
    throw new Error(`Qualification API responded with ${res.status}`);
  }
  // The list endpoint returns `[]` (not a 404) when there are none, already
  // ordered newest `startDate` first.
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
  // A 400 carries a plain-text reason (e.g. an unknown skill id) or JSON
  // ValidationProblemDetails — surface whichever it is to the editor.
  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res));
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
  // A 400 carries a plain-text reason (e.g. an unknown skill id) or JSON
  // ValidationProblemDetails — surface whichever it is to the editor.
  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res));
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
  // A 404 means that id is already gone — the caller's goal state, not a failure.
  if (!res.ok && res.status !== 404) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }
}

export function __resetQualificationCacheForTests() {
  cachedQualifications = null;
}
