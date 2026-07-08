# CLAUDE.md

**Version: 1.5.0** — One-Pager v1.5: Section 08 Reference Photos, sticky section nav, MissingInfoWidget completion badge, major version scheme (publish bumps major), Compatible Devices/Customer Name/Number of Samples fields, per-section N/A toggles.

**GCP deployment: live and verified (2026-07-08)** — Cloud Run running current `main`, feature allowlist moved to Postgres with an admin UI. Real OAuth, CI/CD, and a planned GCS document-storage migration are still open — see the Deployment section below.

Three production tools:
1. **Main MRD Producer** (`/mrd`) — AI-powered 12-section MRD via Gemini Search grounding.
2. **One-Pager Generator** (`/one-pager`) — 7-section product spec, competitor scraper, feature chips, photo picker. **LIVE on main.**
3. **PRD Producer** (`/prd`) — 4-agent pipeline transforms saved One-Pager into structured PRD. Human gate at Agent 2. Streaming UX. DOCX/HTML/PDF export. **LIVE on main (Alpha, allowlist-gated).**

In progress:
4. **Documents Library** — unified dashboard view, One-Pager + PRD docs, tabs, DOCX/HTML download. Plan: `docs/superpowers/plans/2026-04-27-documents-library.md`.

Architecture, directory tree, agent inventory, provider table: `docs/ARCHITECTURE.md`
Code examples (agent, research, provider chain): `docs/QUICK_START.md`

---

## Deployment — dual target (Vercel prod + GCP Cloud Run)

**Vercel** remains production. **GCP Cloud Run** (`mrd-producer`, project `r-and-d-489319`, `us-central1`) is live and verified working as of 2026-07-08, but running with `BYPASS_AUTH=true` (no real OAuth yet) and manual deploys only (CI/CD via GitHub Actions has never succeeded — see `gcp-migration/06-2026-07-08-session-log.md`).

- Both targets currently point at the **same Neon Postgres** — no data divergence yet.
- Feature allowlist is **Postgres-backed**, not the `config/allowlist.txt` file (that file is a local-dev-only fallback now). Manage access via `/admin/allowlist` (admin-only UI) instead of editing the file — editing the file has no effect once deployed, since it's baked into the Docker image at build time.
- **GCS-based document storage is designed but not implemented.** A future session will move One-Pager/PRD documents (not the allowlist) off Postgres onto versioned JSON in Cloud Storage. Full design decisions are recorded in `gcp-migration/06-2026-07-08-session-log.md` under "Next session" — read that before re-deriving the design from scratch.
- IAM changes on the GCP project are logged in `gcp-migration/IAM-CHANGE-LOG.md`.

---

## Commands

```bash
npm run dev          # localhost:3000
npm run build
npm run lint
npm test
npm test -- path/to/test.ts
npm test -- --testNamePattern="name"
npm run test:coverage  # 50% threshold
```

Tests in `__tests__/` mirroring source. Jest + ts-jest. Path alias `@/*` = project root.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini |
| `AUTH_SECRET` | Yes | NextAuth JWT — `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret |
| `POSTGRES_URL` | Yes | Neon Postgres |
| `ANTHROPIC_API_KEY` | No | Claude fallback |
| `OPENAI_API_KEY` | No | OpenAI fallback |
| `USE_MULTI_AGENT` | No | Enable new agent pipeline (default: legacy workflow.ts) |
| `ADMIN_EMAILS` | No | Comma-separated admin emails for rollback access (default: `ori@compulocks.com`) |

Deployed to Vercel. Set env vars in Vercel dashboard. CI/CD: `.github/workflows/deploy.yml`.

---

## Brand Token System

Single source of truth: `styles/tokens/compulocks.css`
- `--brand-primary: #1D1F4A` | `--brand-highlight: #243469` | `--brand-green-dark: #009966` (CTA) | `--brand-green-light: #1db274`
- `--font-body: 'Barlow'` | `--font-heading: 'Barlow Condensed'` — IBM Plex is GONE
- `--brand-surface: #f2f2f2`
- Utility classes: `.section-heading` (69px), `.slide-title` (36px), `.small-title` (21px), `.paragraph-text` (18px), `.content-card` (24px radius, 1px #e0e0e0, 32px padding)
- `--accent` = `var(--brand-green-dark)` throughout — **never use teal `#0f766e`**
- `--op-*` tokens in `app/one-pager/one-pager-tokens.css` reference brand tokens via `var(--brand-green-dark, #009966)`
- DocumentPreview: h1=36px, h2=21px, h3=16px, body=18px (all Barlow)

---

## One-Pager Generator — Version System

- `version` field in state: `"0.x"` = draft, `"1.x"` = published. Displayed as badge in top bar.
- Save Draft increments `0.x` minor (0.1 → 0.2 → ...). Publish bumps to `1.0`; re-publish increments `1.x`.
- PATCH `/api/documents/[id]` now snapshots current content into `version_history` before overwriting (max 20 entries).
- Rollback: admin-only. `GET /api/documents/[id]/versions` lists history. `POST /api/documents/[id]/rollback` restores a snapshot.
- Admin detection: `lib/admin.ts` checks `ADMIN_EMAILS` env var (default: `ori@compulocks.com`).
- `page.tsx` is now a **server component** that reads auth and passes `isAdmin` prop to `OnePagerClient`.
- DB migration: `lib/db-migrations/003-document-versions.sql` — adds `version TEXT DEFAULT '0.1'` and `version_history JSONB DEFAULT '[]'` to `documents`. **Already applied to Neon.**

## One-Pager Generator — Section Structure (v1.4.0)

- **Section 01 "Product Information"** — replaces old "Product Description". Contains:
  - Sub-header "Product Description" + textarea
  - Sub-section "Paint, Texture & Logo": paint finish (gloss/satin/matte/textured/**clear**), RAL codes or Black/White, notes; Logo upload + CMYK/Pantone colors; Material (optional free text)
- **Section 05 "Features"** — `FeatureSelector` no longer contains paint/logo customization (migrated to 01)
- **Footnotes** section at end of form — free text textarea, stored in `state.footnotes`

## One-Pager Generator — Gotchas

- **API route must be dynamic**: `/api/one-pager/config` needs `export const dynamic = 'force-dynamic'` — without it Next.js bakes YAML at build time.
- **YAML features are plain strings**: `standard-features.yaml` uses string lists; `config-loader.ts` normalises to `{id, label}` — don't add object syntax to YAML.
- **M3 chips = `<button aria-pressed>`**: Never `<label><input type="checkbox"/>`. Global `button` style bleeds in — reset via `.one-pager-root button` in `one-pager-tokens.css`.
- **All `--op-*` tokens in one file**: `app/one-pager/one-pager-tokens.css` (light + dark). CSS modules reference tokens only — never hardcode hex.
- **Worktrees need secrets**: Copy `.env.local` manually — not inherited.
- **Photo state is an array**: `photoUrls: string[]` per competitor. `TOGGLE_COMPETITOR_PHOTO` adds or removes (includes() toggle). Never singular `photoUrl`.
- **Popover anchoring**: Need `position: relative` on the `chipWrapper` div wrapping trigger + popover — otherwise popovers escape to page bottom.
- **Logo in DOCX**: `ImageRun` in `Header` paragraph, `TabStopType.RIGHT` for flush-right. Pass `fs.readFileSync` result as `Buffer`.
- **Logo in HTML export**: Base64-encode buffer, embed as `data:image/png;base64,...` in `<img src>`.
- **page.tsx split**: `page.tsx` is now a server component (no `'use client'`). All client logic lives in `OnePagerClient.tsx`. Never add hooks to `page.tsx`.
- **Paint "clear" finish**: No colors needed. Overrides other finishes. Added to `SET_PAINT_FINISH` action payload union and `OnePagerState.customization.paint.finish` type. Also update `one-pager-alpha/page.tsx` if touching the paint type.
- **Version history snapshots on PATCH**: The `PATCH /api/documents/[id]` route reads the existing doc, pushes old content to `version_history`, then writes new content. Keep snapshot logic there — don't duplicate in client.
- **`RESTORE_VERSION` action**: Takes a full `OnePagerState` as payload and replaces current state entirely (sets `lastUpdated: Date.now()`). Used by rollback flow.

**Key One-Pager files:**
- Tokens: `app/one-pager/one-pager-tokens.css`
- Feature config: `config/one-pager/standard-features.yaml`
- Industry/role config: `config/one-pager/industry-roles.yaml`
- State: `app/one-pager/lib/one-pager-state.ts`, `one-pager-context.tsx`
- Export: `app/api/one-pager/export/route.ts`
- Components: `app/one-pager/components/`
- **NEW** Client entry point: `app/one-pager/OnePagerClient.tsx` (page.tsx is now a server component that resolves admin flag)
- **NEW** Product info customization: `app/one-pager/components/ProductInfoCustomization.tsx` (paint/logo/material)
- **NEW** Version history panel: `app/one-pager/components/VersionHistoryPanel.tsx` (admin-only)
- **NEW** Admin helper: `lib/admin.ts` — `isAdmin(email)`, configurable via `ADMIN_EMAILS` env var
- **NEW** Version API: `app/api/documents/[id]/versions/route.ts`, `app/api/documents/[id]/rollback/route.ts`

---

## Feature Gate System

**Source of truth is Postgres (`allowlist` table, migration `004-allowlist.sql`), not a file.** `config/allowlist.txt` is a local-dev-only fallback used when `POSTGRES_URL` isn't set — editing it has no effect on any deployed environment, since Cloud Run bakes it into the image at build time.
- `1` = mrd-generator, `2` = one-pager, `3` = brief-helper, `4` = one-pager-beta, `5` = prd-producer, `6` = one-pager-alpha, `7` = rd-viewer
- `lib/feature-gate.ts` — `getFeaturesForEmail(email)` and `hasFeature(email, key)` are now **async** (query Postgres, 30s in-memory cache). Every call site must `await`.
- **Invite-only — no wildcard.** There is no `*` fallback anymore; every user must have an explicit row.
- Manage access via `/admin/allowlist` (admin-only page + `GET/POST /api/admin/allowlist`, `DELETE /api/admin/allowlist/[email]`) — not by editing the file.
- Dashboard only shows tools the user is allowed — no redirect, just hidden

## Document Export

`lib/document-generator.ts` — `docx` for Word, print-ready HTML for PDF. Arial font, US Letter, 1" margins.
`lib/prd-document-generator.ts` — PRD-specific DOCX + HTML export (Arial, US Letter, 1" margins).
