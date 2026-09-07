# Handoff: Admin Panel — Profile / Skills / Experience

## Overview
Admin surface for ejmabunda.dev. Three records behind one shell: **Profile** (single row, 3 fields), **Skills** (name + category, many rows), **Experience** (roles with dates, description bullets, and linked skills). Plus the login screen. Desktop is a real desktop layout (persistent rail + action bar + context column); mobile is a separate, list-first layout — not a squeezed desktop.

Out of scope: multi-user, roles/permissions, notifications, search, analytics, any navigation beyond "back to site" and "log out".

## About the Design Files
The `.dc.html` files are **design references built in HTML** — working prototypes showing look, layout, and states. They are not production code to copy. Recreate them in the target codebase's framework and conventions.

- `Admin Dashboard v2.dc.html` — **the current design.** Desktop mock (2a, interactive: click the rail, click a skill's Edit, click a timeline role) and the four mobile frames (2b).
- `Admin Dashboard.dc.html` — earlier mobile-only prototype. Still the reference for **login** and the **light theme** palette, and for the save/error/delete states of the Profile form. Its top "preview controls" bar is a review aid, not shipped UI.
- `Admin Dashboard Desktop.dc.html` — the three desktop directions explored. 1a was chosen; 1b and 1c are dead ends, kept for context only.

Labels like `2a`, `2b`, `1a` are review ids, not UI.

## Fidelity
**High-fidelity** for layout, spacing, type, and color — the token values below are the source of truth. Two knowingly incomplete areas: the light theme exists only for Profile/login (see the older file) and needs extending to Skills and Experience; and date pickers are drawn as static fields, so use the platform's native date input.

## Shell

### Desktop (≥1024px)
- **Left rail, 236px, fixed.** Wordmark block (`e` mark + "ejmabunda_" / "admin"), a `CONTENT` group label, then three nav items: Profile, Skills (count badge), Experience (count badge). Active item: accent-tinted background, filled accent dot, primary text; inactive: transparent, grey dot, muted text. Bottom of rail, above a divider: "← back to site" and "log out".
- **Action bar**, full width of the content area, bottom border: page title (19px/600), a live-status pill (accent dot + count, e.g. "live", "26 live", "5 live"), and right-aligned: a "saved 02:14" timestamp, a Delete button (Profile only), and the primary action ("Save changes" / "Save list" / "Add experience" — "Save role" when editing an existing role).
- **Content grid**: `minmax(0,1fr) 288px`, 28px gap, 32px page padding. Main card on the left, context column on the right. Same anatomy on all three tabs.

### Mobile (default, 390px reference)
- Top row: "← back to site" / "log out", 12px mono.
- **Tab row** replaces the rail: three equal pills (Profile / Skills / Experience). Active pill: accent tint + accent border.
- One scrolling content area, 16px side padding.
- **Fixed footer action bar**: status text on the left, primary button on the right (48px min height). Disabled/idle state uses a grey button with "all changes saved".
- All tap targets ≥44px.

## Screens

### 1. Login (`/admin`)
Single centered card, max-width 380px. Wordmark, "Sign in", one line of copy, one password field (label above, lock icon accessory, "show"/"hide" text toggle), full-width primary button. One error state — "Wrong password. Try again." in a danger-tinted banner plus a danger border on the field. Loading: spinner + "Signing in…", button disabled. See `Admin Dashboard.dc.html`.

### 2. Profile
One record, three fields, create/edit framing.

- Card header: "Public information" + "Here you can edit the public information shown on your site. Changes go live immediately."
- Desktop field grid: **Title** and **Headline** side by side, **Subtitle** full width (textarea, min-height 66px). Mobile: stacked, 15px input text.
- Empty record → heading "Create your profile", copy "No profile exists yet. Fill these in to publish one.", primary button "Create profile", no delete affordance.
- Populated → "Edit your profile", primary "Save changes", Delete available (desktop: action-bar button; mobile: underlined danger link at the bottom of the card).
- Context column: **RECORD** panel (status / fields 3 of 3 / updated) and **PREVIEW** panel rendering title, headline, subtitle as they appear on the site.
- Save success: accent banner "Profile saved. Changes are live now." Save error: danger banner "Couldn't save changes. Try again." — fields keep their values.
- Delete: confirmation modal (max-width 340px) — "Delete profile?", "This removes your public profile information from the site. This can't be undone.", right-aligned Cancel (outline) + Delete (solid danger). Scrim click or Cancel dismisses; confirm returns the editor to the create state.

### 3. Skills
Many rows, each a name + one category. 26 seeded skills across 5 categories.

- Card header: "Skill list" + "The skill list shown on your site, grouped by category. Changes go live immediately."
- **Add row** (desktop, in the card header block): `minmax(0,1fr) 220px auto` — name input ("e.g. GitHub"), category select, and a "+ Add skill" button (outline-accent, not solid — the solid primary belongs to the action bar).
- **Table**: mono uppercase header (`SKILL` / `CATEGORY`), then rows of name (14px) + category (12px mono, muted) + right-aligned Edit / Delete outline buttons. Body scrolls; header and add row stay put.
- **Inline edit** (row-level, no modal): clicking Edit swaps that row for a name input (accent border, prefilled) + category select + Save (solid accent) / Cancel (outline). The row gets an accent-tinted background and slightly tighter padding. Category label is `nowrap` + ellipsis — it must not wrap inside its 200px column. Save commits, Cancel discards; only one row edits at a time.
- Context column: **BY CATEGORY** counts, and a **PREVIEW** panel showing the skills as mono outline chips.
- Mobile: add form as a stacked card (input, select, "+ Add skill"), then the list grouped under mono category headers ("LANGUAGES & BACKEND · 8 OF 26") with 44px Edit / Delete buttons per row.

### 4. Experience
Roles with title, employer, start/end dates, description bullets, and linked skills. **Listing and editor are separate on mobile.**

**Desktop** — editor and listing side by side:
- Main card: "Add a role" / "Edit role" (+ a "Cancel edit" outline button when editing), copy "Roles shown on your site's timeline. New entries go live immediately." (edit variant: "Editing an existing entry. Saving updates it on your site immediately.").
- Field grid: **Job title** | **Employer**; **Start date** | **End date (optional)** (placeholders "yyyy / mm" and "present", muted until filled); **Description — one bullet per line** full-width textarea, min-height 92px.
- **Skills used** section, divided off by a top border: label + "N selected" in accent, then the skills as toggle pills grouped under mono category headers. Selected pill: accent border, accent tint, filled accent dot. Unselected: grey border, hollow dot outline. Pills are `nowrap` — the row wraps, the label never breaks.
- Footer: full-width primary ("Add experience" / "Save role").
- Context column: **TIMELINE · N** panel with a "+ New" button and a scrolling list (max-height 640px). Each row: 2px left mark, title, mono "employer · start – end". Clicking a row loads it into the editor: row gets accent mark + tint, an "editing" chip, and a Delete button. Below the panel, a dashed note that edit/delete aren't built server-side yet.

**Mobile** — two screens:
- **Timeline (list)**: header "TIMELINE · 5" + "tap a role to edit", full-height scrolling list, rows = left mark + title + mono meta + a `›` chevron. Footer: "5 roles · newest first" + primary "+ Add role".
- **Editor**: replaces the tab row with "← timeline" (accent) and "role 1 of 5". Card = "Edit role" / "Changes go live immediately." with stacked fields, dates side by side, **Skills used** as selected chips plus a dashed "+ pick skills" chip that opens the full picker, then Description. Footer: Delete (outline danger, icon-width) + Save role (fills remaining width). Add role opens the same editor in create framing.

## Interactions & Behavior
- Login submit → loading → error banner, or success → Profile.
- Save → saving (spinner, button disabled) → success banner, or error banner with values preserved. On a create, the screen switches to the populated framing after success.
- Skills: add appends; Edit is inline per row; Save commits, Cancel discards; Delete needs the same confirm treatment as Profile delete.
- Experience: selecting a role loads it into the editor (desktop) or opens the editor screen (mobile); "+ New" / "+ Add role" clears to create framing.
- Only animation: the button loading spinner (rotate, 0.7s linear infinite). Rail, pills, and timeline rows use ~140ms ease transitions on background/border/color. Hover states follow the codebase's existing conventions.
- Responsive: mobile-first; the desktop grid and rail appear at the wide breakpoint. Nothing has a fixed pixel width except the rail (236px) and the context column (288px).

## State Management
- **Login**: `status: 'idle'|'loading'|'error'`, `password`, `showPassword`.
- **Shell**: `tab: 'profile'|'skills'|'experience'`.
- **Profile**: `mode: 'empty'|'populated'`, `status: 'idle'|'saving'|'success'|'error'`, `title`, `headline`, `subtitle`, `showDeleteModal`.
- **Skills**: `items: [{id, name, category}]`, `draft: {name, category}` for the add row, `editingId`, `editDraft: {name, category}`.
- **Experience**: `roles: [{id, title, employer, start, end, description, skills[]}]`, `selectedRoleId | null` (null = create), `form` mirroring a role, `pickedSkills: string[]`.
- Theme follows the site's existing mechanism; otherwise persist the user/system preference.

## Design Tokens

### Typography
- UI/body: **Helvetica Neue** — `'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif`. Headings, body copy, inputs, primary buttons.
- Accent/code: **JetBrains Mono** — `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`. Wordmark, field labels, group headers, counts, dates, chips, nav links, small buttons.
- Sizes — desktop: 19px/600 page title, 16px/600 card title, 14px body & inputs, 13px descriptions & primary buttons, 12px category cells / rail links, 11px field labels & small buttons, 10px mono group headers (0.09–0.1em letter-spacing).
- Mobile: 17px/600 card title, 15px inputs & row titles, 13px descriptions, 12px tabs, 11px labels.

### Colors — Dark theme (primary)
| Token | Value |
|---|---|
| Page background | `oklch(14% 0.004 260)` |
| Rail / footer / header fill | `oklch(17% 0.006 260)` |
| Card surface | `oklch(19% 0.006 260)` |
| Input fill (on card) | `oklch(14% 0.004 260)` |
| Border | `oklch(28-30% 0.008 260)` |
| Row divider | `oklch(23-24% 0.006 260)` |
| Text primary | `oklch(93% 0.004 260)` |
| Text muted | `oklch(62-68% 0.008 260)` |
| Text faint / labels | `oklch(50-56% 0.008 260)` |
| Accent | `oklch(78% 0.15 152)` |
| Accent on-fill text | `oklch(14% 0.02 152)` |
| Accent tint (active rows, pills, banners) | `oklch(22-23% 0.02-0.05 152)` |
| Accent border (selected pill) | `oklch(50% 0.12 152)` |
| Accent text on tint | `oklch(85% 0.13 152)` |
| Danger | `oklch(72% 0.17 25)` |
| Danger border | `oklch(32-34% 0.03-0.04 25)` |
| Danger banner fill | `oklch(24% 0.05 25)` |
| Modal scrim | `oklch(10% 0.004 260 / 0.72)` |

### Colors — Light theme
| Token | Value |
|---|---|
| Page background | `oklch(98% 0.003 260)` |
| Card surface | `oklch(100% 0 0)` |
| Raised fill | `oklch(96% 0.004 260)` |
| Border | `oklch(89% 0.005 260)` |
| Text primary | `oklch(22% 0.006 260)` |
| Text muted | `oklch(46% 0.008 260)` |
| Text faint | `oklch(60% 0.008 260)` |
| Accent | `oklch(46% 0.14 152)` |
| Accent on-fill text | `oklch(98% 0.01 152)` |
| Danger | `oklch(50% 0.18 25)` |
| Danger banner fill | `oklch(94% 0.04 25)` |
| Success banner fill | `oklch(93% 0.05 152)` |
| Modal scrim | `oklch(20% 0.006 260 / 0.55)` |

Both themes share the accent hue (152) and danger hue (25); only lightness and backgrounds change. **If the live site has its own brand color, swap the accent hue** — green was chosen without access to ejmabunda.dev's real palette, and it's the one token most likely to be wrong.

### Spacing / radii
- Radii: cards 14–16px, inputs/buttons 9–10px, small buttons/chips 6–8px, pills 20px, modal 14px, phone frame 26px.
- Desktop: page padding 32px, card padding 26–30px, grid gap 28px, field gap 20px/22px, table row padding 13px 26px.
- Mobile: side padding 16px, card padding 18px, field gap 16px, row padding 16px, footer padding 14px 16px 22px.
- Rail 236px; context column 288px; desktop skill table body scrolls; timeline panel max-height 640px.

## Assets
No images. Two inline glyph accessories: a lock icon (16×16, two strokes) on the password field, and text glyphs for chevrons (`›`, `⌄`) and the date-field mark (`▤` — replace with the real date input's native affordance).

## Copy
Use the strings in the prototypes verbatim where quoted above — they're written for this tool's tone (lowercase mono utility links, plain-sentence descriptions, no exclamation marks).

## Content in the prototype
Seeded from the live app: 26 skills across Languages & Backend (8), Systems & Data (4), Platform (4), Testing & Reliability (5), Cloud & DevOps (5); 5 roles from Junior Developer (Xiquel Group) back to IT Support Assistant (Northlink College). Sample data only — the real records come from the API.

## Files
- `Admin Dashboard v2.dc.html` — current design: desktop + 4 mobile frames.
- `Admin Dashboard.dc.html` — login, light theme, Profile save/error/delete states.
- `Admin Dashboard Desktop.dc.html` — desktop direction exploration (1a chosen).

(The `.dc.html` prototypes live in the original handoff zip, not this repo.)

---

## Implementation status — done by Claude Code

Built against `src/components/admin/*` + the `.admin-*` layer in
`src/app/globals.css`. Verified with `tsc`, ESLint, Vitest, and `next build`.

- **Accent hue** — kept on the site's own hue (52, warm), not the handoff's
  placeholder green (152), per the "swap the accent hue" note. Token names and
  the light/dark structure follow the handoff; five new tokens were added
  (`--admin-fill`, `--admin-divider`, `--admin-accent-tint`,
  `--admin-accent-border`, `--admin-accent-on-tint`).
- **Shell** (`Dashboard.tsx`) — mobile-first: top links + 3-pill tab row +
  scrolling body + fixed footer action bar. At `min-width: 1024px` this becomes
  the 236px rail (wordmark, `CONTENT` group, nav with count badges + dots,
  back/log-out at the foot) + a header action bar + the
  `minmax(0,1fr) 288px` content grid. Each tab's manager renders its own action
  bar and context column; the shell only owns the rail/tab-row and the live
  counts the managers report up.
- **Profile** (`ProfileEditor.tsx`) — Title/Headline side by side, Subtitle
  full width; RECORD + PREVIEW context panels; create/edit framing; success /
  error banners; delete via the action-bar button (desktop) or the card's
  danger link (mobile), through the shared confirm modal.
- **Skills** (`SkillsManager.tsx`) — add row in the card header (name / category
  / outline "+ Add skill"), a category-grouped list with a sticky header,
  inline per-row edit, BY CATEGORY + PREVIEW context panels. Changes are
  immediate, so the action-bar primary sits in its idle "all changes saved"
  state.
- **Experience** (`ExperiencesManager.tsx`) — full CRUD now that the backend
  ships `PUT`/`DELETE` (`/api/Experience/{id}`). Editor card (field grid +
  "Skills used" toggle pills grouped by category) beside a scrolling TIMELINE
  panel; clicking a role loads it into the editor with an "editing" chip;
  Delete + Cancel-edit live in the editor header. Mobile splits the list and
  editor into separate views with a "← timeline" back link.
- **Login** — unchanged; it already matched the handoff.

### Known simplifications (flagged for review)

- The action-bar "saved 02:14" timestamp is omitted — the API returns no
  updated-at, and the status line ("unsaved changes" / "all changes saved")
  covers the same intent.
- `PUT /api/Experience/{id}` takes every field as optional; the editor sends
  the whole form on each save, so clearing the end date sends `endDate: null` —
  confirm the backend treats that as "clear" rather than "keep".
