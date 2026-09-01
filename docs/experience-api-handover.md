# Experience API — Frontend Handover

`ExperienceController` GET + POST are built, verified locally, and being deployed now.
This is what the frontend (the other Claude Code session) picks up:

- **Landing page** — replace the hardcoded experience entries with the live API, and
  show each entry's skills as tags (new — see §6).
- **Admin portal** — add an "Experience" tab that can **create** new entries.
- **Not yet:** update + delete. Junior is building those on the backend tomorrow — leave
  them out for now.

| | |
|---|---|
| Base path | `/api/Experience` |
| Auth | JWT Bearer (same as Skill / Profile) — reads anonymous, writes require a token |
| Base URL | `NEXT_PUBLIC_API_BASE_URL` (see `src/lib/config.ts`) |
| Skill catalog | `GET /api/Skill` — already integrated (`src/lib/skillApi.ts`) |

> **Prod isn't live yet.** Backend deploy + Azure SQL migration are in progress. Until
> that lands, `/api/Experience` only works against a local backend (`http://localhost:5014`).
> Develop against local or wait for the go-ahead.

---

## 1. What to replace

`src/content/experience.ts` currently hardcodes:

```ts
export interface ExperienceEntry {
  role: string; org: string; dateRange: string;
  tone: "accent" | "accent-2"; bullets: string[];
}
```

Follow the **exact pattern already used for skills** — don't invent a new one:

| Skills (done) | Experience (build the same) |
|---|---|
| `src/lib/skillApi.ts` | `src/lib/experienceApi.ts` |
| `src/hooks/useSkills.ts` | `src/hooks/useExperiences.ts` |
| `src/components/sections/Skills.tsx` (live + fallback) | update `Experience.tsx` the same way |
| `src/content/skills.ts` kept as fallback | keep `src/content/experience.ts` as fallback |
| `src/components/admin/SkillsManager.tsx` | `src/components/admin/ExperiencesManager.tsx` (create only) |

Copy the cold-start retry / timeout / cache scaffolding from `skillApi.ts` verbatim —
same serverless DB, same first-request-wakes-it behavior.

---

## 2. `GET /api/Experience` — public

Returns all experiences. **No ordering guarantee** (currently insertion order). Sort
client-side by `startDate` descending for the timeline.

```jsonc
// 200 OK
[
  {
    "id": "00116dbb-6810-421c-a703-aecfe9872f77",
    "jobTitle": "Junior Developer",
    "employer": "Xiquel Group",
    "startDate": "2026-02-02T00:00:00",
    "endDate": "2027-01-31T00:00:00",     // null = ongoing role
    "description": "Responsible for backend…\r\nBuilt an automated…\r\nRefactored a legacy…",
    "skills": [
      { "id": "f12ba2b4-…", "name": ".NET", "skillCategory": "LanguagesAndBackend" },
      { "id": "1be17dbe-…", "name": "Jest", "skillCategory": "TestingAndReliability" }
      // …
    ]
  }
]
```

`skills[]` is the **same `SkillDto` shape** as `GET /api/Skill` — `skillCategory` is the
enum **name** string (`"LanguagesAndBackend"`), not an int. Reuse the `Skill` type and
`CATEGORY_LABEL` / `CATEGORY_TONE` maps you already have.

## 3. `GET /api/Experience/{id}` — public

`200` with one `ExperienceDto`, or `404`. The landing page doesn't need this (the list
carries everything); useful later for an admin edit screen.

## 4. `POST /api/Experience` — admin (Bearer)

```jsonc
// request body — ExperienceAddDto
{
  "jobTitle": "…",           // required
  "employer": "…",           // required
  "startDate": "2026-02-01", // required (ISO date or datetime)
  "endDate": null,           // optional / nullable
  "description": "line one\nline two\nline three",  // required
  "skillIds": ["ff87c78a-…", "b3b43267-…"]          // required; may be []
}
```

- **No `id`** — server-assigned.
- Every `skillId` must exist in `GET /api/Skill`. Validate client-side against the loaded
  skill list before submitting (the admin form should be a multi-select of real skills).
- Duplicate ids are de-duped server-side.

| Status | Meaning |
|---|---|
| `201` | created — `Location` header + `ExperienceDto` body (with `skills[]` populated) |
| `400` | missing/invalid field **(JSON `ValidationProblemDetails`)** *or* unknown skill id **(plain-text body `"Incorrect SkillId provided."`)** |
| `401` | no / expired token → run the refresh-then-retry flow, same as skills |

Two different `400` shapes — don't assume JSON on every 400.

---

## 5. Mapping API → the existing timeline UI

`TimelineEntry` props are `{ role, org, dateRange, tone, bullets, isLast }`. From `ExperienceDto`:

| UI field | From API |
|---|---|
| `role` | `jobTitle` |
| `org` | `employer` |
| `dateRange` | format client-side from `startDate` / `endDate`. `endDate: null` → `"… – Present"`. Parse the **calendar date only** — the value is `"2026-02-02T00:00:00"` with no offset; `new Date()` + locale formatting can shift it a day. Take `YYYY-MM` and format the month. |
| `tone` | not in the API. `TimelineEntry` only supports `"accent"` / `"accent-2"` — assign client-side (alternate by index, or first = accent). |
| `bullets` | `description.split(/\r?\n/)` — drop empty lines. When POSTing, join the form's bullet inputs with `\n`. |
| `skills` | **new** — see §6 |

> **Heads-up on the seeded data:** the Xiquel entry has `endDate: "2027-01-31T00:00:00"`
> (fixed-term contract end), so it renders as a date range, not "Present". If you want
> "Present" there, that's a backend data change — flag it to Junior, don't hack around it.

---

## 6. Skills per experience — new, needs a design pass

Each experience should surface the skills learnt / applied in that role, as tags, so it
mirrors the Core Skills section's visual language. There's **no hardcoded equivalent** to
replace — this is net-new.

- Reuse `<Tag>` and the `CATEGORY_TONE` map already in `Skills.tsx` (lines 18-24). Each
  `skill.skillCategory` → `CATEGORY_TONE[name]` → `<Tag tone={…}>{skill.name}</Tag>`.
- Obvious default: a tag row beneath the entry's bullets. But you have latitude — propose
  the layout (a labelled "Skills" row, a compact chip cluster under the header, grouped by
  category, etc.). Keep it consistent with the existing tag styling and the timeline's
  spacing rhythm.
- Include it in the loading skeleton and the fallback path too (the fallback
  `content/experience.ts` has no skills — either add a `skills: string[]` to the fallback
  shape, or just render skill tags only when live data is present).

Bring a short proposal for how this looks before wiring it everywhere.

---

## 7. Admin

Add an **"Experience"** tab to `src/components/admin/Dashboard.tsx` alongside Profile /
Skills. `ExperiencesManager` for now is **create-only**:

- form: job title, employer, start date, end date (nullable), description (textarea →
  split to bullets on `\n`), skills multi-select (from `GET /api/Skill`).
- on `201`, prepend the returned `ExperienceDto` to the list.
- reuse the `authFetch` / refresh-retry wrapper from the skills admin work.
- no edit / delete buttons yet — Junior adds `PUT` / `DELETE` on the backend tomorrow and
  they'll be a follow-up handover.

---

## 8. Seeded data (what you'll see in dev)

| Experience | Dates | Skills |
|---|---|---|
| Junior Developer @ Xiquel Group | 2026-02 → 2027-01 | .NET, API Integrations, Automated test suite design, C#, Dynamics 365 / CRM, Incident triage, JavaScript (ES6+), Jest, Process Automation, Root-cause analysis, SQL Server, T-SQL |
| Volunteer Technical Mentor @ WeThinkCode_ | 2025-09 → 2025-12 | Code review, Git |

---

## 9. Working agreement

- **Do not `git push`.** Wait for Junior's approval before anything leaves the machine.
- **Do commit locally** to checkpoint progress — encouraged.
- **Attribution:** Junior did not do this frontend work and doesn't want it to look like he
  did. Author these commits as Claude, e.g.
  `git commit --author="Claude <noreply@anthropic.com>" …` and include the trailer:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
  Make the commit body state plainly that the change was done by Claude Code.
- **Scope:** GET (landing) + POST (admin create) only. No update / delete.
- Branch off, don't commit straight to the default branch.

---

## 10. Frontend status — done by Claude Code

Landing + admin-create wired against the contract above. Verified with `tsc`,
ESLint, Vitest, and `next build`; runtime testing is pending against a local
backend (prod not live yet).

- **Landing:** `Experience.tsx` reads `GET /api/Experience` via `useExperiences`
  (`src/hooks/`) + `src/lib/experienceApi.ts` — cold-start retry / timeout / cache
  copied from `skillApi.ts`. Sorted newest-first by `startDate`; `dateRange`
  formatted from the calendar `YYYY-MM` only (no `Date` parsing); `tone`
  alternates by index; bullets from `description.split(/\r?\n/)`.
- **Not a fallback:** per a later project decision, the landing sections are now
  purely API-driven. `src/content/experience.ts` was **deleted** (and the Skills
  fallback with it, in a companion change); an empty list or a fetch error shows
  a short "not available" message, matching the Hero/profile pattern.
- **Skills per experience (§6):** rendered as a compact `<Tag>` chip cluster
  directly under the role/employer/date line, before the bullets — no label.
  Tones come from `CATEGORY_TONE`, moved out of `Skills.tsx` into `skillApi.ts`
  so both surfaces share one map. Skeleton + empty/error paths carry no chips.
- **Admin:** `ExperiencesManager.tsx` (create-only) on a new "Experience" tab in
  `Dashboard.tsx`. Skills multi-select is a category-grouped checkbox list built
  from `GET /api/Skill`. `runAuthed` (401 → refresh → retry) reused from the
  skills admin work. No edit/delete UI — awaiting the backend `PUT`/`DELETE`.

---

_Backend source: `backend/Controllers/ExperienceController.cs`, `Services/ExperienceService.cs`,
`Repositories/ExperienceRepository.cs`, `Dtos/ExperienceDto.cs`. GET + POST verified locally
against SQL Server (26 skills, 2 experiences). PUT / DELETE not yet built._
