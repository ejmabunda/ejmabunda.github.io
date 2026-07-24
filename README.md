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
- **Vitest** + **React Testing Library** for component smoke tests.

## Project structure

```text
src/
  app/               Next.js App Router entry (layout, page, global styles)
  content/           Typed content/data — copy, links, skills, experience,
                     education. Edit these files to change what's on the
                     site; components read from them rather than hardcoding text.
  components/
    ui/              Design-system primitives (Button, Tag, SectionDivider, Eyebrow)
    layout/          Page chrome (Nav, ThemeToggle, Footer)
    sections/        The page's content sections (Hero, Skills, Experience, Education)
```

Design tokens (colors, spacing, radii, shadows, fonts) live as CSS custom
properties in `src/app/globals.css`, mirrored into Tailwind's `@theme` block
so both hand-authored component classes (`.btn`, `.tag`, etc.) and Tailwind
utilities read from the same source of truth. Dark mode is a manual toggle
(not OS-preference-based): it sets a `data-theme="dark"` attribute on
`<html>`, persisted to `localStorage`, and every token re-resolves
automatically under that attribute.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build + static export to `out/` |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest component smoke tests |

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
site (`npm run build`, producing a static export in `out/`) and publishes it
via GitHub Pages. The custom domain is configured through `public/CNAME`
(copied into the export output automatically, since everything in `public/`
is copied verbatim to `out/`), pointing at `ejmabunda.dev`.

## Editing content

Almost everything on the page — the bio, skill tags, work experience,
education, and social links — is data, not markup. To update copy, edit the
relevant file under `src/content/` rather than the components in
`src/components/`.
