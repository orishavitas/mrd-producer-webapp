# Repo Optimization — Design Document

**Date:** 2026-02-22
**Status:** Approved

## Overview

A 4-phase project to unify the mrd-producer-webapp codebase: establish a single Compulocks brand design system, apply it to all features, merge all worktree branches into a clean main branch, and extract the one-pager into a standalone deployable repo.

---

## Goals

1. One design language across all features (Compulocks: navy, Barlow, uppercase labels)
2. CSS custom properties throughout — no hardcoded hex values in components
3. Single `main` branch with all features; all worktrees deleted
4. Standalone `mrd-one-pager` repo deployable independently

---

## Phase 1 — Compulocks Design System

### Token File

New file: `styles/tokens/compulocks.css`

Single source of truth for all brand and semantic values. Imported by `app/globals.css`.

```css
:root {
  /* Brand */
  --brand-primary: #1D1F4A;
  --brand-highlight: #243469;
  --brand-surface: #f4f5f9;
  --brand-surface-alt: #fafafa;

  /* Typography */
  --font-body: 'Barlow', sans-serif;
  --font-heading: 'Barlow Condensed', sans-serif;
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 22px;
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.6;

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Borders */
  --border-color: #d1d5db;
  --border-color-strong: #9ca3af;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(29,31,74,0.08);
  --shadow-md: 0 4px 12px rgba(29,31,74,0.12);

  /* Semantic */
  --text-primary: var(--brand-primary);
  --text-secondary: #374151;
  --text-muted: #6b7280;
  --bg-chip: #e8ecf4;
  --focus-ring: 0 0 0 2px rgba(36,52,105,0.2);

  /* Transitions */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Shared Component Classes (globals.css)

Four global classes used across all features:

- `.btn-primary` — navy background, Barlow Condensed, uppercase, `--radius-sm`
- `.card` — white surface, `--radius-md`, `--shadow-sm`, `--border-color`
- `.field label` — Barlow Condensed, uppercase, `--text-xs`, `--text-muted`
- `.page-header` — `--brand-primary`, `--text-2xl`, Barlow Condensed

### Font Loading (layout.tsx)

Load Barlow and Barlow Condensed at root layout level — available to all routes.

```tsx
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-body' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-heading' });
```

Remove IBM Plex Sans and IBM Plex Mono from root layout (replaced by Barlow stack).

---

## Phase 2 — Apply Design System to All Features

### Scope per feature

| Feature | Route | Change |
|---------|-------|--------|
| One-Pager | `/one-pager` | Refactor CSS Modules: hardcoded hex → CSS custom properties |
| Dashboard | `/` | Restyle TopBar, ToolCard, DocumentsTable, DashboardShell |
| Login | `/login` | Restyle card with brand tokens |
| MRD Generator | `/mrd` | Restyle form card, buttons, result display |
| Brief Helper | `/brief-helper` | Port from teal token system to Compulocks tokens |

### Refactoring rule for one-pager CSS Modules

Find/replace across all 9 component `.module.css` files:

| Old value | New value |
|-----------|-----------|
| `#1D1F4A` | `var(--brand-primary)` |
| `#243469` | `var(--brand-highlight)` |
| `border-radius: 6px` | `border-radius: var(--radius-sm)` |
| `border-radius: 8px` | `border-radius: var(--radius-md)` |
| `#d1d5db`, `#e5e7eb` | `var(--border-color)` |
| `rgba(36,52,105,0.15)` | `var(--focus-ring)` |
| `#e8ecf4` | `var(--bg-chip)` |
| `#6b7280`, `#374151` | `var(--text-muted)`, `var(--text-secondary)` |
| font-size: `13px` / `14px` | `var(--text-sm)` / `var(--text-base)` |

### What does NOT change in Phase 2

- Component logic, props, API routes
- HTML structure
- Accessibility attributes

---

## Phase 3 — Merge to main + cleanup

### Merge order

1. `feature/unified-dashboard` → `main`
2. `feat/one-pager-integrate` → `main` (most complete one-pager, includes all 9 components + DOCX/HTML export)
3. `feature/product-brief-helper` → `main`
4. Delete intermediate branches: `feat/one-pager-ui`, `feat/one-pager-state`, `feat/one-pager-scraper`
5. Remove all `.worktrees/` directories
6. Remove external worktree: `mrd-producer-webapp-product-brief`
7. Stash `design/material-3-expressive` → create archive tag, then delete stash

### Known conflicts to resolve manually

| File | Conflict | Resolution |
|------|----------|------------|
| `app/page.tsx` | Dashboard vs original MRD page | Keep dashboard version |
| `app/globals.css` | Teal vs Compulocks tokens | Keep Compulocks (from Phase 1) |
| `app/layout.tsx` | IBM Plex vs Barlow fonts | Keep Barlow (from Phase 1) |

### Final route map

```
/                    → Dashboard (auth-gated, NextAuth v5)
/login               → Login page
/mrd                 → MRD Generator
/one-pager           → One-Pager Generator
/brief-helper        → Brief Helper
/brief-helper/start  → Brief input start flow
```

---

## Phase 4 — Standalone One-Pager Repo

### New repo: `mrd-one-pager`

Created by cloning main post-Phase-3, stripping to one-pager only, then pushing to new GitHub repo.

### Contents

```
mrd-one-pager/
├── app/
│   ├── page.tsx              ← root = one-pager (no dashboard, no auth wall)
│   ├── layout.tsx            ← Barlow fonts, globals.css
│   ├── globals.css
│   ├── one-pager/
│   │   ├── components/       ← all 9 components (CSS vars from Phase 1)
│   │   └── lib/              ← one-pager state/context
│   └── api/
│       └── one-pager/        ← all one-pager API routes
├── styles/
│   └── tokens/
│       └── compulocks.css    ← design system token file
├── lib/
│   └── providers/            ← AI providers (Gemini, Claude, OpenAI)
│   └── sanitize.ts
├── .env.example
├── package.json
├── CHANGELOG.md
└── README.md
```

### What it does NOT contain

- Dashboard, TopBar, ToolCard, DocumentsTable
- Auth (NextAuth, middleware, login page)
- MRD Generator
- Brief Helper
- Vercel Postgres / Drive sync
- Any `feature/unified-dashboard` specific code

### Creation process

1. `git clone` from main into new directory
2. `git filter-branch` or manual deletion to strip non-one-pager routes and APIs
3. Update `package.json` (remove unused deps: `@vercel/postgres`, `next-auth`, `googleapis`, etc.)
4. Update `README.md` with standalone deployment instructions
5. `git init` fresh history (or keep history — TBD)
6. Push to new GitHub repo

---

## Success Criteria

- [ ] `npm run build` passes on main with 0 TypeScript errors
- [ ] All routes visually use Compulocks tokens (navy, Barlow) — no teal accent visible
- [ ] No hardcoded `#1D1F4A` in any CSS Module file
- [ ] Zero worktrees remaining (confirmed by `git worktree list`)
- [ ] `main` branch has one-pager, MRD, brief helper, dashboard all working
- [ ] `mrd-one-pager` repo builds and runs standalone with `npm run dev`
- [ ] `mrd-one-pager` has no auth dependency

---

## Out of Scope

- Dark mode (Compulocks brand has no dark mode spec yet)
- New features / functionality changes
- Test suite updates (unless build breaks tests)
- CI/CD pipeline changes
