import { API_BASE_URL } from "./config";
import { UnauthorizedError } from "./apiErrors";
import type { TagTone } from "@/content/types";

export { UnauthorizedError };

/**
 * Skill categories are an enum with an asymmetry baked into the API: responses
 * serialize the category as its **name** (`"Platform"`), but request bodies bind
 * it as the backing **integer** (`2`). The API has no `JsonStringEnumConverter`,
 * so sending the name in a POST/PUT body is a 400. This map is the single source
 * of truth for both directions on the frontend.
 */
export const SKILL_CATEGORY = {
  LanguagesAndBackend: 0,
  SystemsAndData: 1,
  Platform: 2,
  TestingAndReliability: 3,
  CloudAndDevOps: 4,
} as const;

export type SkillCategoryName = keyof typeof SKILL_CATEGORY;

/** Category names in their canonical (enum-int) order — for stable grouping. */
export const SKILL_CATEGORY_NAMES = Object.keys(
  SKILL_CATEGORY
) as SkillCategoryName[];

export const CATEGORY_LABEL: Record<SkillCategoryName, string> = {
  LanguagesAndBackend: "Languages & Backend",
  SystemsAndData: "Systems & Data",
  Platform: "Platform",
  TestingAndReliability: "Testing & Reliability",
  CloudAndDevOps: "Cloud & DevOps",
};

export function isKnownCategory(value: string): value is SkillCategoryName {
  return value in SKILL_CATEGORY;
}

/**
 * Tag colour per category. Shared by the Core Skills section and the
 * per-experience skill chips so a given category always reads the same colour.
 * Kept stable so the palette doesn't shift as skills are recategorised.
 */
export const CATEGORY_TONE: Record<SkillCategoryName, TagTone> = {
  LanguagesAndBackend: "accent",
  SystemsAndData: "accent-2",
  Platform: "neutral",
  TestingAndReliability: "outline",
  CloudAndDevOps: "outline",
};

export interface Skill {
  id: string;
  name: string;
  /** enum NAME on the way out (e.g. "Platform") */
  skillCategory: SkillCategoryName;
}

export interface SkillCreateInput {
  name: string;
  /** enum INT on the way in (0–4) */
  skillCategory: number;
}

export interface SkillUpdateInput {
  id: string;
  /** omit / null to keep the current value */
  name?: string;
  /** omit / null to keep the current value */
  skillCategory?: number;
}

const SKILL_ENDPOINT = () => `${API_BASE_URL}/api/Skill`;

const REQUEST_TIMEOUT_MS = 10_000;
// Same cold-start story as the profile endpoint: the backing DB is a serverless
// tier that suspends after inactivity, so the first request after a quiet period
// can hang or time out while it wakes — a short wait then a retry recovers.
const RETRY_DELAYS_MS = [3_000, 5_000];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchSkillsOnce(): Promise<Skill[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(SKILL_ENDPOINT(), { signal: controller.signal });
    if (!res.ok) throw new Error(`Skill API responded with ${res.status}`);
    // The list endpoint returns `[]` (not a 404) when there are no skills.
    return (await res.json()) as Skill[];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSkillsWithRetry(): Promise<Skill[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetchSkillsOnce();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
}

let cachedSkills: Promise<Skill[]> | null = null;

/**
 * Fetches the skill list, retrying through cold starts. Cached for the page's
 * lifetime so the cold-start cost is paid at most once per visit.
 */
export function getSkills(): Promise<Skill[]> {
  if (!cachedSkills) {
    cachedSkills = fetchSkillsWithRetry().catch((err) => {
      // Don't cache a permanent failure — let a later call try again.
      cachedSkills = null;
      throw err;
    });
  }
  return cachedSkills;
}

/**
 * Same as getSkills, but bypasses the cache — the admin dashboard needs the
 * current list on every visit (including right after a create/delete).
 */
export function getSkillsFresh(): Promise<Skill[]> {
  return fetchSkillsWithRetry();
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createSkill(
  token: string,
  input: SkillCreateInput
): Promise<Skill> {
  const res = await fetch(SKILL_ENDPOINT(), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Create skill failed with ${res.status}`);
  return (await res.json()) as Skill;
}

export async function updateSkill(
  token: string,
  input: SkillUpdateInput
): Promise<Skill> {
  // The id goes in the body here, not the route — unlike GET-by-id and DELETE.
  const res = await fetch(SKILL_ENDPOINT(), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Update skill failed with ${res.status}`);
  return (await res.json()) as Skill;
}

export async function deleteSkill(token: string, id: string): Promise<void> {
  const res = await fetch(`${SKILL_ENDPOINT()}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError();
  // A 404 means that id is already gone — the caller's goal state, not a failure.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete skill failed with ${res.status}`);
  }
}

export function __resetSkillCacheForTests() {
  cachedSkills = null;
}
