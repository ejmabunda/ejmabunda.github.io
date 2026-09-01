# Skill API — Frontend Handover

The `SkillController` CRUD is merged and verified against Postman (local SQL Server).
This is what the frontend needs to integrate it: **read** on the portfolio landing
page, **create / update / delete** behind the admin portal.

| | |
|---|---|
| Base path | `/api/Skill` (routing is `api/[controller]`, case-insensitive) |
| Auth scheme | JWT Bearer |
| Reads | anonymous |
| Writes | `Authorization: Bearer <accessToken>` |
| Content type | `application/json` |
| Base URL | environment config — same origin as the rest of the API |

CORS is locked to the single deployed frontend origin (`ApiSettings:FrontendUrl`) with
credentials allowed. Browser calls from any other origin fail preflight — confirm the
local dev origin with backend.

---

## 1. Endpoint summary

| Method & path | Purpose | Auth | Surface |
|---|---|---|---|
| `GET /api/Skill` | List all skills | none | Landing |
| `GET /api/Skill/{id}` | One skill by id | none | Landing / Admin |
| `POST /api/Skill` | Create a skill | Bearer | Admin |
| `PUT /api/Skill` | Update a skill | Bearer | Admin |
| `DELETE /api/Skill/{id}` | Delete a skill | Bearer | Admin |

---

## 2. Authentication

Writes require a JWT access token. Reads ignore it.

### Get a token

```
POST /api/Auth/login
Content-Type: application/json

{ "password": "<admin password>" }
```

```jsonc
// 200 OK
{ "token": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900          // seconds; value comes from server config
} }
```

Login also sets an `httpOnly` refresh cookie (`X-Refresh-Token`, `SameSite=None; Secure`).
You never read it — just send it back with `credentials: "include"`.

### Refresh & expiry

- `POST /api/Auth/refresh` with `credentials: "include"` → returns a fresh `{ token }` and
  rotates the cookie. No body needed.
- `POST /api/Auth/logout` revokes the session and clears the cookie.
- On any `401` from a write call: try `/refresh` once, replay the request, and if refresh
  also fails send the user back to login.

> **The API generates a new RSA signing key on every startup** (`Program.cs`). After any
> backend redeploy or restart, every previously issued access token is invalid. The
> refresh flow recovers automatically, so the 401 → refresh → retry handler is **not
> optional** — it is the normal path after a deploy.

---

## 3. Data model

Every endpoint that returns a skill returns the same `SkillDto`:

```jsonc
{
  "id": "060270bd-26a5-4ffc-6664-08df0792d16d",  // GUID, server-assigned
  "name": "GitHub",
  "skillCategory": "Platform"                      // enum NAME on the way out
}
```

### ⚠️ Enum asymmetry — the single biggest integration snag

Responses serialize `skillCategory` as the **name** (`"Platform"`). Request bodies bind it
as the **integer** (`2`). The API has **no** `JsonStringEnumConverter` configured, so
`"skillCategory": "Platform"` in a POST/PUT body returns `400`.

Keep a bidirectional map on the frontend, **or** ask backend to add the converter (see §8).

| Int (send) | Name (receive) | Suggested label |
|---|---|---|
| `0` | `LanguagesAndBackend` | Languages & Backend |
| `1` | `SystemsAndData` | Systems & Data |
| `2` | `Platform` | Platform |
| `3` | `TestingAndReliability` | Testing & Reliability |
| `4` | `CloudAndDevOps` | Cloud & DevOps |

```ts
// shared between landing + admin
export const SKILL_CATEGORY = {
  LanguagesAndBackend: 0,
  SystemsAndData: 1,
  Platform: 2,
  TestingAndReliability: 3,
  CloudAndDevOps: 4,
} as const;

export type SkillCategoryName = keyof typeof SKILL_CATEGORY;

export const CATEGORY_LABEL: Record<SkillCategoryName, string> = {
  LanguagesAndBackend: "Languages & Backend",
  SystemsAndData: "Systems & Data",
  Platform: "Platform",
  TestingAndReliability: "Testing & Reliability",
  CloudAndDevOps: "Cloud & DevOps",
};

export interface Skill {
  id: string;
  name: string;
  skillCategory: SkillCategoryName;
}
```

---

## 4. Endpoints

### `GET /api/Skill` — public

Returns every skill as an array of `SkillDto`. No params, no paging, **no ordering
guarantee** — sort client-side.

| Status | Meaning |
|---|---|
| `200` | `SkillDto[]` |
| `200` | `[]` when there are no skills — **not** a `404` |

```jsonc
// 200 OK
[
  { "id": "060270bd-…", "name": "GitHub", "skillCategory": "Platform" },
  { "id": "ad9ff174-…", "name": "PostgreSQL", "skillCategory": "SystemsAndData" }
]
```

### `GET /api/Skill/{id}` — public

`{id}` is the GUID. Returns a single `SkillDto`.

| Status | Meaning |
|---|---|
| `200` | `SkillDto` |
| `404` | unknown id |

The landing page does not strictly need this — `GET /api/Skill` already carries every
field. Useful for an admin "edit" screen loaded by URL.

### `POST /api/Skill` — admin

Creates a skill. Id is assigned by the server — **do not send one**.

| Field | Type | Notes |
|---|---|---|
| `name` | string | **required**, non-empty |
| `skillCategory` | int | **required**, `0`–`4` |

```
POST /api/Skill
Authorization: Bearer <token>

{ "name": "GitHub", "skillCategory": 2 }
```
```jsonc
// 201 Created — Location: /api/Skill/<newId>
{ "id": "060270bd-…", "name": "GitHub", "skillCategory": "Platform" }
```

| Status | Meaning |
|---|---|
| `201` | created — `Location` header + `SkillDto` body |
| `400` | missing field **or** out-of-range category int |
| `401` | no / expired token |

**Two different `400` shapes:** a missing `name`/`skillCategory` yields the standard
`ValidationProblemDetails` object; an out-of-range category int (e.g. `7`) yields a
**plain-text** body `"Invalid skill category."`. Don't assume JSON on every 400.

### `PUT /api/Skill` — admin

Partial update. **`id` goes in the body, not the route.** Omitted or `null` fields are
left unchanged.

| Field | Type | Notes |
|---|---|---|
| `id` | GUID | **required** |
| `name` | string? | optional — null / omit = keep current |
| `skillCategory` | int? | optional — null / omit = keep current |

```
PUT /api/Skill
Authorization: Bearer <token>

{ "id": "060270bd-…", "skillCategory": 4 }
```
```jsonc
// 200 OK — rename skipped, category → CloudAndDevOps
{ "id": "060270bd-…", "name": "GitHub", "skillCategory": "CloudAndDevOps" }
```

| Status | Meaning |
|---|---|
| `200` | updated `SkillDto` |
| `404` | unknown id **— or invalid category int** (quirk, see below) |
| `401` | no / expired token |

**Quirk:** an invalid `skillCategory` int currently returns `404`, not `400` — the service
can't distinguish "not found" from "bad enum". Validate the category client-side against
the map so you never hit this.

### `DELETE /api/Skill/{id}` — admin

`{id}` in the route. No body, no response body.

| Status | Meaning |
|---|---|
| `204` | deleted |
| `404` | unknown id |
| `401` | no / expired token |

Treat `204` and `404` the same from the UI: the row is gone — refetch or drop it from
local state.

---

## 5. Landing page — read path

No auth, no token handling.

- Fetch once on load / build. If the site is statically generated, this can run at build time.
- Group by `skillCategory` using `CATEGORY_LABEL`; the API returns a flat list in no
  guaranteed order.
- Sort within a group by `name` (locale compare).
- Empty array → render the section's empty state, not an error.
- Network / 5xx failure → keep the last good render or hide the section; never block the page.

```ts
async function loadSkills(): Promise<Skill[]> {
  const res = await fetch(`${API_BASE}/api/Skill`);
  if (!res.ok) throw new Error(`skills ${res.status}`);
  return res.json();
}
```

---

## 6. Admin portal — write path

Every call carries `Authorization: Bearer` and goes through a shared 401 handler.

```ts
async function authFetch(path: string, init: RequestInit = {}) {
  const call = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${getAccessToken()}` },
      credentials: "include", // send refresh cookie on retries
    });

  let res = await call();
  if (res.status === 401) {
    const ok = await tryRefresh(); // POST /api/Auth/refresh
    if (!ok) {
      redirectToLogin();
      throw new Error("auth");
    }
    res = await call();
  }
  return res;
}
```

Operations:

- **Create** — `POST /api/Skill` with `{ name, skillCategory: SKILL_CATEGORY[key] }`.
  On `201`, read the returned `SkillDto` into the table.
- **Update** — `PUT /api/Skill` with `{ id, ...changedFields }`. Only send fields the user
  actually edited.
- **Delete** — `DELETE /api/Skill/{id}`. Confirm first; on `204`/`404` remove the row.

Validate before submit:

- `name`: trim, require non-empty.
- `skillCategory`: must be one of the five keys — submit the mapped int, never a
  free-text string. This keeps you clear of both the plain-text `400` and the misleading
  `404`.

---

## 7. Gotchas

- **Enum in vs. out** — send `int`, receive `string` name (§3).
- **Signing key resets on deploy** — access tokens die on every backend restart; 401 →
  refresh → retry is the norm after a deploy.
- **PUT takes `id` in the body**, not the route — unlike GET-by-id and DELETE.
- **Invalid category** → `404` on PUT, plain-text `400` on POST. Validate client-side.
- **No ordering, paging, or filtering** on the list endpoint. Do it in the client.
- **CORS is single-origin with credentials** — local dev must run on the exact configured
  origin or calls fail preflight.
- **`404` on write** means "that skill id is gone" — reconcile local state, don't show a
  hard error.

---

## 8. Checklist

### Frontend picks up

- [x] **Landing:** skills section reads `GET /api/Skill`, groups by category, handles empty array.
      `src/components/sections/Skills.tsx` + `src/hooks/useSkills.ts`. Falls back to the
      bundled `src/content/skills.ts` on empty/error so the section is never blank.
- [x] **Admin:** skill table with create / edit / delete against the three write endpoints.
      `src/components/admin/SkillsManager.tsx`, reached via the Profile/Skills tabs in
      `src/components/admin/Dashboard.tsx`.
- [x] **Shared:** category map + labels module (`SKILL_CATEGORY`, `CATEGORY_LABEL`, `Skill`,
      `SKILL_CATEGORY_NAMES`) in `src/lib/skillApi.ts`. Category is sent as `int`, received
      as name — the admin form binds names and maps to the int on submit.
- [x] **Auth:** `runAuthed` (401 → refresh → retry) mirrors `ProfileEditor`; shared
      `UnauthorizedError` moved to `src/lib/apiErrors.ts`.

### Confirm with backend

- [x] Add `JsonStringEnumConverter`? **No** — not for now. Frontend keeps the bidirectional
      `SKILL_CATEGORY` map (`src/lib/skillApi.ts`).
- [x] Access-token lifetime is **10 minutes**. Nothing in the frontend hard-codes it — the
      401 → refresh → retry path handles expiry. Still need the dev frontend origin in CORS.
- [ ] Should the plain-text `400` on POST become `ValidationProblemDetails` for consistency?
- [ ] Is signing-key persistence across restarts planned, or does the client just live with post-deploy refreshes?

---

_Source: `backend/Controllers/SkillController.cs`, `Services/SkillService.cs`,
`Repositories/SkillRepository.cs`, `Dtos/SkillDto.cs`. CRUD reviewed and verified via
Postman against the local SQL Server instance._
