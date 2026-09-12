import { API_BASE_URL } from "./config";
import { UnauthorizedError } from "./apiErrors";
import { fetchWithTimeout, retryThroughColdStart } from "./coldStartRetry";
import type { Skill } from "./skillApi";

export { UnauthorizedError };

/**
 * No `/api/Project` controller exists yet — this client is built against the
 * anticipated `Experience`-shaped contract per the console redesign handoff:
 * a `{Feature}Dto` with populated `skills`, an `AddDto` with `skillIds`, and
 * an all-optional `UpdateDto`. It will 404 until the backend ships.
 */
export interface Project {
  id: string;
  name: string;
  url: string;
  /** Same `SkillDto` shape as `GET /api/Skill`. */
  skills: Skill[];
}

export interface ProjectCreateInput {
  name: string;
  url: string;
  /** GUIDs that must exist in `GET /api/Skill`; may be empty. */
  skillIds: string[];
}

export interface ProjectUpdateInput {
  name?: string;
  url?: string;
  skillIds?: string[];
}

const PROJECT_ENDPOINT = () => `${API_BASE_URL}/api/Project`;

async function fetchProjectsOnce(): Promise<Project[]> {
  const res = await fetchWithTimeout(PROJECT_ENDPOINT());
  // No controller exists yet, so this 404s today. Once it ships, an empty
  // list comes back as `[]` (the Experience/Skill convention), not a 404 —
  // so treat a 404 as "nothing to show" and resolve immediately rather than
  // burning the whole cold-start retry budget on what is, right now, a
  // permanently missing route.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Project API responded with ${res.status}`);
  return (await res.json()) as Project[];
}

function fetchProjectsWithRetry(): Promise<Project[]> {
  return retryThroughColdStart(fetchProjectsOnce);
}

let cachedProjects: Promise<Project[]> | null = null;

/**
 * Fetches the project list, retrying through cold starts. Cached for the
 * page's lifetime so the cold-start cost is paid at most once per visit.
 */
export function getProjects(): Promise<Project[]> {
  if (!cachedProjects) {
    cachedProjects = fetchProjectsWithRetry().catch((err) => {
      cachedProjects = null;
      throw err;
    });
  }
  return cachedProjects;
}

/** Same as getProjects, but bypasses the cache — used by the admin console. */
export function getProjectsFresh(): Promise<Project[]> {
  return fetchProjectsWithRetry();
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createProject(
  token: string,
  input: ProjectCreateInput
): Promise<Project> {
  const res = await fetch(PROJECT_ENDPOINT(), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Create project failed with ${res.status}`);
  return (await res.json()) as Project;
}

export async function updateProject(
  token: string,
  id: string,
  input: ProjectUpdateInput
): Promise<Project> {
  const res = await fetch(`${PROJECT_ENDPOINT()}/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Update project failed with ${res.status}`);
  return (await res.json()) as Project;
}

export async function deleteProject(token: string, id: string): Promise<void> {
  const res = await fetch(`${PROJECT_ENDPOINT()}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete project failed with ${res.status}`);
  }
}

export function __resetProjectCacheForTests() {
  cachedProjects = null;
}
