# ejmabunda.dev

Personal portfolio site for Matimu Mabunda — a backend-focused software
developer. Built with Next.js (App Router), TypeScript, and Tailwind CSS v4,
statically exported and deployed to GitHub Pages at
[ejmabunda.dev](https://ejmabunda.dev).

## Tech stack

- **Next.js 15** (App Router), statically exported (`output: 'export'`) since
  the site is hosted on GitHub Pages with no server runtime.
- **TypeScript**, **React 19**.
- **Tailwind CSS v4**, using its CSS-first `@theme` configuration.
- **Vitest** + **React Testing Library** for component and API-client tests.

The public site is static. The `/admin` route is a client-only screen that
talks to the [.NET portfolio API](../backend) to edit profile and skills
content live.

## Project structure

```text
src/
  app/
    page.tsx           Public landing page (Hero, Skills, Experience, Education)
    admin/             Client-only admin screen (noindex) — login + dashboard
  content/             Typed content/data — copy, links, experience, education.
                       Edit these to change static copy; components read from
                       them rather than hardcoding.
  components/
    ui/                Design-system primitives (Button, Tag, SectionDivider, Eyebrow)
    layout/            Page chrome (Nav, MobileMenu, ThemeToggle, Footer)
    sections/          Landing-page sections (Hero, Skills, Experience, Education)
    admin/             Admin UI (LoginForm, Dashboard, ProfileEditor, SkillsManager)
  hooks/               Data hooks for the public page (useProfile, useSkills)
  lib/                 API clients — config, authApi, profileApi, skillApi, apiErrors
docs/                  Integration notes (e.g. skill-api-handover.md)
```

Design tokens (colors, spacing, radii, shadows, fonts) live as CSS custom
properties in `src/app/globals.css`, mirrored into Tailwind's `@theme` block
so hand-authored component classes (`.btn`, `.tag`, etc.) and Tailwind
utilities read from the same source of truth. Dark mode is a manual toggle
(not OS-preference-based): it sets `data-theme="dark"` on `<html>`, persisted
to `localStorage`, and every token re-resolves under that attribute.

## Backend API

The Hero and Skills sections are driven entirely by the .NET API. When the API
returns nothing or can't be reached, each section shows a short "not available"
message instead of a fallback list, so the page never renders stale content.
Experience and Education are still static (`src/content/`) until the API covers
them.

- **Base URL** — `NEXT_PUBLIC_API_BASE_URL`, defaulting to the deployed Azure
  host (`src/lib/config.ts`). Set it in `.env.local` to point at a local API.
- **Reads** (`getProfile`, `getSkills`) are anonymous and retried through the
  serverless DB's cold start, then cached for the page's lifetime.
- **Admin auth** — `POST /api/Auth/login` returns an access token held only in
  memory; the refresh token is an `httpOnly` cookie. On load the admin screen
  calls `/api/Auth/refresh` to resume a session. Write calls that 401 refresh
  once and retry — the API regenerates its signing key on every restart, so a
  post-deploy 401 is routine.

See [`docs/skill-api-handover.md`](docs/skill-api-handover.md) for the full
Skill endpoint contract.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To run against a local
backend, add `NEXT_PUBLIC_API_BASE_URL=http://localhost:5014` to `.env.local`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build + static export to `out/` |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest suite |

`out/` is plain static files — serve it with any static server (e.g.
`npx serve out`) to preview the production build.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
site (`npm run build`, producing the static export in `out/`) and publishes it
via GitHub Pages. The custom domain is configured through `public/CNAME`
(copied verbatim into `out/` like everything in `public/`), pointing at
`ejmabunda.dev`.

## Editing content

Static copy — work experience, education, and social links — is data, not
markup. Edit the relevant file under `src/content/`. Live profile and skills
content is edited through `/admin`, which writes to the backend API; the
Hero and Skills sections render only what the API returns.
