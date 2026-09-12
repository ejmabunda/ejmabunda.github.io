import { API_BASE_URL } from "./config";
import { UnauthorizedError } from "./apiErrors";
import { fetchWithTimeout, retryThroughColdStart } from "./coldStartRetry";
import type { Skill } from "./skillApi";

export { UnauthorizedError };

/**
 * No `/api/Certification` controller exists yet — this client is built
 * against the anticipated `Experience`-shaped contract per the console
 * redesign handoff. It will 404 until the backend ships.
 */
export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  /** Calendar date, serialized as `"2026-02-02T00:00:00"` with no zone. */
  issueDate: string;
  url: string;
  /** Same `SkillDto` shape as `GET /api/Skill`. */
  skills: Skill[];
}

export interface CertificationCreateInput {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  url: string;
  skillIds: string[];
}

export interface CertificationUpdateInput {
  name?: string;
  issuingOrganization?: string;
  issueDate?: string;
  url?: string;
  skillIds?: string[];
}

const CERTIFICATION_ENDPOINT = () => `${API_BASE_URL}/api/Certification`;

async function fetchCertificationsOnce(): Promise<Certification[]> {
  const res = await fetchWithTimeout(CERTIFICATION_ENDPOINT());
  // No controller exists yet, so this 404s today — see projectApi's
  // fetchProjectsOnce for why a 404 resolves to [] instead of retrying.
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Certification API responded with ${res.status}`);
  }
  return (await res.json()) as Certification[];
}

function fetchCertificationsWithRetry(): Promise<Certification[]> {
  return retryThroughColdStart(fetchCertificationsOnce);
}

let cachedCertifications: Promise<Certification[]> | null = null;

/**
 * Fetches the certification list, retrying through cold starts. Cached for
 * the page's lifetime so the cold-start cost is paid at most once per visit.
 */
export function getCertifications(): Promise<Certification[]> {
  if (!cachedCertifications) {
    cachedCertifications = fetchCertificationsWithRetry().catch((err) => {
      cachedCertifications = null;
      throw err;
    });
  }
  return cachedCertifications;
}

/** Same as getCertifications, but bypasses the cache — used by the admin console. */
export function getCertificationsFresh(): Promise<Certification[]> {
  return fetchCertificationsWithRetry();
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createCertification(
  token: string,
  input: CertificationCreateInput
): Promise<Certification> {
  const res = await fetch(CERTIFICATION_ENDPOINT(), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    throw new Error(`Create certification failed with ${res.status}`);
  }
  return (await res.json()) as Certification;
}

export async function updateCertification(
  token: string,
  id: string,
  input: CertificationUpdateInput
): Promise<Certification> {
  const res = await fetch(`${CERTIFICATION_ENDPOINT()}/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    throw new Error(`Update certification failed with ${res.status}`);
  }
  return (await res.json()) as Certification;
}

export async function deleteCertification(
  token: string,
  id: string
): Promise<void> {
  const res = await fetch(`${CERTIFICATION_ENDPOINT()}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete certification failed with ${res.status}`);
  }
}

export function __resetCertificationCacheForTests() {
  cachedCertifications = null;
}
