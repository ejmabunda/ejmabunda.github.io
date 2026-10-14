# Qualification API — Frontend Handover

`QualificationController` is built on the backend with full CRUD (GET list, GET by id,
POST, PUT, DELETE). This is what the frontend (the other Claude Code session) picks up.

**You already have most of this.** `src/lib/qualificationApi.ts` and
`src/components/admin/QualificationsManager.tsx` were written ahead of the backend against
an *anticipated* contract. This handover is mostly a **reconciliation**: the real contract
is below, and §2 lists exactly where the existing code is wrong.

- **Admin portal** — fix the existing Qualifications tab to match the real API (§2).
- **Landing page** — replace the hardcoded `Education` section with the live API (§7).

| | |
|---|---|
| Base path | `/api/Qualification` |
| Auth | JWT Bearer (same as Skill / Experience) — reads anonymous, writes require a token |
| Base URL | `NEXT_PUBLIC_API_BASE_URL` (see `src/lib/config.ts`) |
| Skill catalog | `GET /api/Skill` — already integrated (`src/lib/skillApi.ts`) |

> Check `GET /api/Qualification` against prod first. If it 404s, prod hasn't picked up the
> controller yet — develop against a local backend (`http://localhost:5014`).

---

## 1. Contract summary

```ts
// Response shape — GET list, GET by id, POST (201), PUT (200)
interface Qualification {
  id: string;                 // GUID
  name: string;
  institution: string;
  startDate: string;          // "2024-01-01T00:00:00" — no offset
  endDate: string | null;     // null = in progress
  nqfLevel: NqfLevelName;     // enum NAME on the way out, e.g. "Diploma"
  skills: Skill[];            // same SkillDto as GET /api/Skill, sorted by name
}

// POST body — every field required
interface QualificationCreateInput {
  name: string;
  institution: string;
  startDate: string;          // "YYYY-MM-DD"
  endDate: string | null;     // must be present; null = in progress
  nqfLevel: number;           // enum INT on the way in, 1–10
  skillIds: string[];         // required; may be []
}

// PUT body — see §5 for the endDate trap
interface QualificationUpdateInput {
  name?: string;
  institution?: string;
  startDate?: string;
  endDate: string | null;     // NOT optional in practice — always send it
  nqfLevel?: number;
  skillIds?: string[];        // omit = keep links, [] = clear all, list = replace exactly
}
```

Same asymmetric enum format as `Skill.skillCategory`: **int in, name out**. The backend
has no `JsonStringEnumConverter`, so sending `"nqfLevel": "Diploma"` is a `400`.

---

## 2. What's wrong in the existing code

### 2a. NQF enum names — `src/lib/qualificationApi.ts`

The provisional `Nqf1`…`Nqf10` keys are wrong. The backend returns these names
(`Models/Qualification.cs`, `enum NqfLevel`):

| Int (send) | Name (receive) | Keep your label |
|---|---|---|
| 1 | `Grade9` | Grade 9 |
| 2 | `Grade10` | Grade 10 |
| 3 | `Grade11` | Grade 11 |
| 4 | `Grade12` | National Senior Certificate |
| 5 | `HigherCertificate` | Higher Certificate |
| 6 | `Diploma` | Diploma |
| 7 | `BachelorsDegree` | Bachelor's Degree |
| 8 | `HonoursDegree` | Honours Degree |
| 9 | `MastersDegree` | Master's Degree |
| 10 | `DoctoralDegree` | Doctoral Degree |

Rename the keys in `NQF_LEVEL` and `NQF_LEVEL_LABEL` (the int values and labels are
already right). Then fix every `Nqf<n>` literal elsewhere — there are ~8 outside
`qualificationApi.ts`, including the form default `nqfLevel: "Nqf7"` in
`QualificationsManager.tsx` (→ `"BachelorsDegree"`) and test fixtures. Update the doc
comment that says the names are provisional.

### 2b. `QualificationUpdateInput.endDate` — make it required

Change `endDate?: string | null` to `endDate: string | null` so the type system forces
every PUT to carry it (reason in §5). `QualificationsManager` already sends the full form
including `endDate`, so it's fine today — this guards future callers.

### 2c. Remove the "no controller yet" 404 shim

`fetchQualificationsOnce` treats `404` as `[]` because the controller didn't exist. It
does now — the list endpoint returns `[]` itself when empty and never 404s. Drop the shim
(and the comment) so a real misconfiguration surfaces as an error. Match whatever
`experienceApi.ts` does.

### 2d. Admin list ordering

The manager sorts by NQF level descending (`byNqfLevelDesc`). The API already returns
**newest `startDate` first**. Either is defensible for admin — but the landing page
(§7) should use the API order. Your call for admin; keep it consistent with
`ExperiencesManager`.

### 2e. Error messages

`create/updateQualification` throw a generic `"… failed with 400"`. The backend sends
useful plain-text bodies (§4) — surface them in the banner the way the experience/skill
managers do, if they do (check `src/lib/apiErrors.ts`).

---

## 3. `GET /api/Qualification` — public

All qualifications, **ordered newest `startDate` first** (server-side — unlike
Experience, you don't need to sort). `[]` when empty.

```jsonc
// 200 OK — seeded data
[
  {
    "id": "a774c9bc-61f5-4309-a53a-4da9d11494ec",
    "name": "Occupational Certificate: Software Engineer",
    "institution": "WeThinkCode_",
    "startDate": "2024-01-01T00:00:00",
    "endDate": "2025-01-01T00:00:00",
    "nqfLevel": "Diploma",
    "skills": [
      { "id": "9f1ac98a-d659-4bb5-afe8-b5b859516f59", "name": "AWS (CloudFormation, ECS, Fargate)", "skillCategory": "CloudAndDevOps" },
      { "id": "24e71b43-a73b-4b25-89fa-08df07c4f846", "name": "Automated test suite design", "skillCategory": "TestingAndReliability" },
      { "id": "2571f576-4632-40ef-89ff-08df07c4f846", "name": "CI/CD pipelines", "skillCategory": "CloudAndDevOps" }
      // …5 more (8 total)
    ]
  },
  {
    "id": "af1ca55f-3d3e-4a66-b743-cdd9b5bbba0c",
    "name": "National Senior Certificate",
    "institution": "Ponelopele Oracle Secondary School",
    "startDate": "2017-12-01T00:00:00",
    "endDate": "2017-12-01T00:00:00",
    "nqfLevel": "Grade12",
    "skills": []
  }
]
```

## 4. Status codes

| Endpoint | Status | Body |
|---|---|---|
| `GET /{id}` | `200` | one `Qualification` |
| | `404` | **empty** |
| `POST` | `201` | `Qualification` + `Location` header, `skills[]` populated |
| | `400` | unknown skill id → plain text `"One or more skill ids do not exist."` **or** missing/invalid field → JSON `ValidationProblemDetails` |
| | `401` | refresh-then-retry (`runAuthed`) |
| `PUT /{id}` | `200` | updated `Qualification`, `skills[]` populated |
| | `400` | empty GUID (`"Please provide a valid qualification Id."`) or unknown skill id (plain text) |
| | `404` | `"Qualification does not exist on DB."` |
| `DELETE /{id}` | `204` | none |
| | `400` | empty GUID |
| | `404` | `"Could not find a qualification with the provided id."` |

Two different `400` shapes — don't assume JSON on every 400. Duplicate `skillIds` are
de-duped server-side. Deleting a qualification removes its skill links, not the skills.

---

## 5. ⚠ PUT clears `endDate` if you omit it

Every other scalar on PUT is "omit = leave unchanged". **`endDate` is not** — the service
does `qualification.EndDate = dto.EndDate` with no fallback, so an omitted `endDate`
silently flips a finished qualification to "in progress".

**Always send `endDate`** (the date, or `null` for in progress). This is a known backend
bug; sending it every time stays correct after it's fixed. Don't build a "send only the
changed fields" PUT.

`skillIds` on PUT: omit → links untouched; `[]` → clears all; a list → server mirrors it
exactly. The manager sends the full picked list every time — keep doing that.

---

## 6. Dates

- Values are `"2024-01-01T00:00:00"` with **no offset**. Treat as a calendar date. Take
  `YYYY-MM` from the string — same approach as `Experience.tsx` (§10 of the experience
  handover). `toDateInput` in the manager (`iso.slice(0, 10)`) is already correct.
- Only month + year matter; seed data uses the 1st of the month.
- **Start can equal end** (the NSC entry: Dec 2017 → Dec 2017). Render a single date,
  not `Dec 2017 – Dec 2017`.
- The backend doesn't validate `endDate >= startDate` — check it in the form.

---

## 7. Landing page — `Education` section

`src/components/sections/Education.tsx` still renders hardcoded `src/content/education.ts`.
Per the project decision recorded in the experience handover (§10), landing sections are
**purely API-driven, no fallback**. Follow the Experience pattern:

| Experience (done) | Qualification (build the same) |
|---|---|
| `src/lib/experienceApi.ts` | `src/lib/qualificationApi.ts` (exists — fix per §2) |
| `src/hooks/useExperiences.ts` | `src/hooks/useQualifications.ts` |
| `Experience.tsx` loading / empty / error states | `Education.tsx` the same way |
| `src/content/experience.ts` deleted | delete `src/content/education.ts` (and `EducationEntry` in `types.ts` if unused) |

Display per entry (keep the current compact `label · meta` layout unless you propose
otherwise): `name` as the label; meta as `institution · date range` (`– Present` when
`endDate` is null). Optionally an NQF level and skill chips (`<Tag>` + `CATEGORY_TONE`,
same as Experience) — hide the chip row when `skills` is empty. Bring a short proposal if
you add skill chips.

> **Content mismatch — flag to Junior, don't resolve it yourself.** The hardcoded list
> has *BSc Computer Science (Rhodes)* and a *Cloud Computing Elective*; the backend seed
> has the *WeThinkCode_ Occupational Certificate* and the *National Senior Certificate*.
> Going API-driven changes what visitors see. Junior decides whether to add entries via
> the admin console first.

---

## 8. Done checklist

- [ ] No `Nqf<n>` literals remain; `tsc`, ESLint, Vitest and `next build` pass
- [ ] Admin list loads both seeded qualifications with correct NQF labels
- [ ] Editing only the name leaves `endDate` and skills unchanged
- [ ] "In progress" saves `endDate: null` and shows "In progress" / "Present"
- [ ] Clearing all skills in the picker removes them
- [ ] An unknown-skill `400` shows the backend's message, not "failed with 400"
- [ ] Delete → `204` → removed from list
- [ ] Landing `Education` renders from the API, newest first; NSC shows a single date
- [ ] Expired token → refresh → retry once

---

## 9. Working agreement

Same as the previous handovers:

- **Do not `git push`.** Wait for Junior's approval before anything leaves the machine.
- **Do commit locally** to checkpoint progress, on a branch — not the default branch.
- **Attribution:** author commits as Claude (`git commit --author="Claude <noreply@anthropic.com>" …`),
  include your model's `Co-Authored-By` trailer, and state plainly in the commit body that
  the change was done by Claude Code.
- **Scope:** reconcile the admin tab + make `Education` API-driven. No backend changes.

When done, append a **"Frontend status — done by Claude Code"** section to this file,
like §10 of `experience-api-handover.md`.

---

_Backend source: `backend/src/ejmabunda-web-api/Controllers/QualificationController.cs`,
`Services/QualificationService.cs`, `Repositories/QualificationRepository.cs`,
`Dtos/QualificationDto.cs`, `Models/Qualification.cs`. Postman: `Portfolio API › Qualifications`._

---

## 10. Frontend status — done by Claude Code

Admin tab reconciled and the landing `Education` section made API-driven, on branch
`feat/qualification-api-integration` (local only, not pushed). Verified with `tsc`,
ESLint, Vitest (229/229) and `next build`. `GET /api/Qualification` on prod returns
both seeded entries in the shape the types expect (the WeThinkCode_ entry has 7
skills on prod, not 8 as in §3). The write paths are covered by unit tests only:
nothing was created, edited or deleted against prod, and no local backend was running.

- **§2a enum:** `NQF_LEVEL` / `NQF_LEVEL_LABEL` keys now mirror the backend's
  `enum NqfLevel` (`Grade9` … `DoctoralDegree`); the "provisional" comment is gone,
  and a test pins the exact name→int map. No `Nqf<n>` literals remain. Form default
  is `BachelorsDegree`.
- **§2b:** `QualificationUpdateInput.endDate` is required. The manager always sends
  the full form (incl. `endDate` and the full `skillIds` list) on PUT, and a test
  asserts the exact body when only the name changes.
- **§2c:** 404 shim removed. A list 404 is now an error (retried through the
  cold-start window, then surfaced), matching `experienceApi.ts`.
- **§2d:** admin list sorts newest `startDate` first, same as `ExperiencesManager`
  and the API. The period column reads `YYYY-MM` off the string (it used
  `new Date()` before) and collapses a same-month start/end to one date.
- **§2e:** `apiErrors.ts` gained `ApiError(status, message)` and
  `readErrorMessage(res)`, which handles both 400 shapes: plain text is used
  as-is, and for `ValidationProblemDetails` it takes the first field error, else
  the title. `create`/`update`/`delete` throw it, and the banner shows the backend
  message, falling back to the generic copy when the body is empty. Only the
  qualification client uses it so far; Experience/Skill still throw the generic error.
- **Form validation (§6):** the editor blocks an end date before the start date
  (the input's native `min` plus a banner as a backstop). It also requires an end
  date unless "In progress" is ticked. Before, an empty end date silently saved
  as `null` (in progress).
- **Landing (§7):** `Education.tsx` reads `useQualifications` (new,
  `src/hooks/`) with loading skeleton, error and empty states copied from
  `Experience.tsx`. It renders in API order as `name` + `institution · date range`,
  with `– Present` for a null end and a single date when start and end are the
  same month. `src/content/education.ts` and `EducationEntry` are deleted.
- **Not done, needs a decision:** NQF level and skill chips on the landing
  entries were left out. Proposal: reuse Experience's `<Tag>` + `CATEGORY_TONE`
  chip row under each entry, hidden when `skills` is empty. That would show the
  WeThinkCode_ certificate's 7 skills and nothing for the NSC.
- **Content change, flagged for Junior:** the landing page now shows the backend
  seed (WeThinkCode_ Occupational Certificate, National Senior Certificate)
  instead of the old hardcoded list (BSc Computer Science at Rhodes, the
  Cloud Computing Elective). Add those through the admin console if they
  should stay.
