# Changelog

## [GCP] - 2026-07-08

### Added
- `allowlist` Postgres table (`lib/db-migrations/004-allowlist.sql`) — feature allowlist moved off the file baked into the Docker image, since Cloud Run's immutable containers meant an admin UI editing `config/allowlist.txt` could never persist
- Admin UI + API at `/admin/allowlist` for adding/removing guest access without a redeploy (`app/admin/allowlist/`, `app/api/admin/allowlist/`)
- `gcp-migration/IAM-CHANGE-LOG.md` — audit trail of IAM roles self-granted this session, each explicitly authorized
- `gcp-migration/06-2026-07-08-session-log.md` — full session record: what was fixed, what's still open, decisions already made for the next session

### Changed
- `config/allowlist.txt` — wildcard `*` access removed (invite-only going forward); file now serves only as a local-dev fallback when Postgres is unreachable
- `lib/feature-gate.ts` — now async, reads from Postgres with a 30s cache instead of `fs.readFileSync`
- `.github/workflows/deploy.yml` — `gcloud run deploy` step now actually wires `POSTGRES_URL`/`AUTH_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_API_KEY` via `--set-secrets`; previously deployed with zero env vars configured
- Cloud Run service `mrd-producer`: plaintext `AUTH_SECRET`/`GOOGLE_API_KEY`/`POSTGRES_URL` moved to Secret Manager; deployed current `main` (was 5 weeks stale)

### Fixed
- Production 500 on every DB-backed route (`/api/documents`, `/api/admin/allowlist`) — root cause was a literal double-quote character in the `POSTGRES_URL` Secret Manager secret (carried over verbatim from `.env.local`'s bash-style quoting), which made `pg` try to resolve a garbage hostname (`getaddrinfo EAI_AGAIN base`). Fixed by re-creating the secret with quotes stripped; verified on an isolated 0%-traffic revision before cutting production over.

### Discovered
- The IAP blocker recorded in the 2026-06-04 entry below was already resolved by the time this session started — the live service had no IAP annotation and served the app publicly. Memory wasn't updated when it was fixed.
- CI/CD (`deploy-gcp` job) had failed on every single run since 2026-06-04 — `WIF_PROVIDER`/`WIF_SERVICE_ACCOUNT`/`GCP_PROJECT_ID`/`GCP_REGION`/`GCP_ARTIFACT_REGISTRY` were never set as GitHub secrets. Every prior Cloud Run update was a manual `gcloud run deploy`, not CI/CD.
- `ori@compulocks.com` had `run.admin`/`secretmanager.admin`/etc. but zero `serviceusage.*` or Cloud Storage permissions, blocking `gcloud builds submit` entirely until self-granted (with explicit authorization) mid-session.
- Cloud SQL was dropped from the migration plan partway through in favor of GCS-based JSON document storage for One-Pager/PRD (design decided, not yet implemented — see session log).

## [GCP] - 2026-06-04

### Added
- `gcp-migration/` — 5-doc IT onboarding set (01-architecture-overview, 02-gcp-setup-guide, 03-github-cicd-integration, 04-database-options, 05-google-services-integration)
- `.superpowers/gcp-migration-plan.html` — live migration tracker with session progress, IAM blocker callout, all commands pre-filled for project `r-and-d-489319` / `us-central1`
- `.superpowers/gcp-roles-guide.html` — IAM roles guide for GCP org admin (Option A: Editor+SecurityAdmin, Option B: 7 least-privilege roles, console nav steps, docs links)

### Changed
- `.github/workflows/deploy.yml` — replaced Vercel production job with GCP Cloud Run deploy job (WIF auth, Artifact Registry push, `gcloud run deploy`); PR previews via Vercel unchanged
- `gcp-migration/02-gcp-setup-guide.md` — updated to `us-central1`, `r-and-d-489319`, real project number `269404192985`
- `gcp-migration/03-github-cicd-integration.md` — updated to real project ID/region/SA email; WIF setup commands pre-filled
- `gcp-migration/04-database-options.md` — updated region to `us-central1`

### Discovered
- GCP project `r-and-d-489319` already has `mrd-producer` Cloud Run service deployed (by danny@compulocks.com on 2026-04-26, last updated by ori today at 09:52)
- Cloud Build trigger `04ad2523` wired to repo — CI/CD already partially set up
- Running service has critical issues: IAP blocking all traffic, `NEXTAUTH_SECRET=supersecret123456` hardcoded, no POSTGRES_URL/OAuth secrets, port 8080 vs Dockerfile 3080
- `lib/db-client.ts` already uses `pg` package — no code change needed for Cloud SQL migration
- `ori@compulocks.com` has `run.admin` on the existing service (confirmed via test update) but lacks Artifact Registry/IAM/Secret Manager admin

## [1.6.0] - 2026-05-26

### Added
- One-Pager top bar redesign with a compact 52px identity/progress/action layout, progress ring status panel, export dropdown, overflow menu, and floating preview FAB.
- Responsive preview mode choice for narrow viewports, including split view and form-posted HTML preview in a new tab.
- Focused regression coverage for the section nav, top bar controls, preview FAB, and form-encoded One-Pager export.

### Changed
- Section navigation now clips to active section plus adjacent labeled pills, while non-neighbor sections collapse to numbered circles with completion and skipped states.
- One-Pager split layout now supports vertical and horizontal preview modes with the preview panel rendered only when open.

## [1.5.0] - 2026-05-25

### Added
- **Section 08 — Reference Photos** — new section with per-photo upload (via `PhotoPicker`) + notes field; Additional Notes sub-section at the bottom; `ReferencePhotosSection` component.
- **Section Navigation** — sticky horizontal pill bar (`SectionNavMenu`) at top of left scroll area; IntersectionObserver tracks active section; skipped sections dimmed.
- **MissingInfoWidget** — persistent completion badge (replaces old progress bar) with floating panel listing all 13 sections, done/skip status, per-section "Not Relevant" checkbox.
- **Major version scheme** — Publish now bumps major version (`0.x→1.0`, `1.x→2.0`, etc.) via `bumpMajorVersion` in publish route; Save Draft stays minor-bump (`bumpMinorVersion`).
- **Compatible Devices field** — new Document Info field with N/A toggle; stored in `state.compatibleDevices` / `state.compatibleDevicesSkipped`.
- **Customer Name field** — new Document Info field with N/A toggle; stored in `state.customerName` / `state.customerNameSkipped`.
- **Number of Samples field** — new Commercials field; stored in `state.numberOfSamples`.
- **Section-level "Not relevant" toggles** — Goal, Where, Who, Use Cases, Features, Competitors, Reference Photos all get N/A buttons via `skippedSections` state map; sections collapse when marked N/A; nav pill dims.
- `app/one-pager/components/ReferencePhotosSection.tsx` + `.module.css` — photo list with per-photo notes.
- `app/one-pager/components/SectionNavMenu.tsx` + `.module.css` — sticky section nav.
- `app/one-pager/components/MissingInfoWidget.tsx` + `.module.css` — completion widget.

### Changed
- **`OnePagerData` interface** (export lib) — extended with `compatibleDevices`, `customerName`, `numberOfSamples`, `referencePhotos`, `additionalNotes`, `skippedSections`.
- **DOCX export** — meta block adds Customer + Compatible Devices; Commercials adds Number of Samples; Section 08 Reference Photos with embedded images + notes + Additional Notes.
- **HTML export** — same additions as DOCX.
- **`DocumentPreview`** — meta row shows Customer + Compatible Devices; Commercials shows Number of Samples; Reference Photos section with figure/figcaption per photo.
- **Publish route** — replaced minor-bump with `bumpMajorVersion`; snapshots content into `version_history` on every publish.
- **`getCompletionSections`** — expanded from 9 → 13 sections; all sections now carry `key` + `skippable` fields.

## [1.4.0] - 2026-05-14

### Added
- **Version system** — `version` field in `OnePagerState` + DB: `0.x` = draft (auto-increments on Save Draft), `1.x` = published (bumps on Publish). Version badge shown in top bar.
- **Version history + rollback (admin-only)** — PATCH `/api/documents/[id]` now snapshots previous content into `version_history` (max 20). New endpoints: `GET /api/documents/[id]/versions`, `POST /api/documents/[id]/rollback`. `VersionHistoryPanel` component shows history table with per-entry Restore button.
- **Admin gate** — `lib/admin.ts` with `isAdmin(email)`. Configurable via `ADMIN_EMAILS` env var (default: `ori@compulocks.com`). `page.tsx` is now a server component passing `isAdmin` prop to client.
- **Footnotes field** — free-text textarea at end of One-Pager form, stored in `state.footnotes`.
- **Material field** — optional free-text input in Product Information section (`state.customization.material`).
- **Paint "Clear" finish** — new finish option that overrides colors (no RAL/Black/White needed).
- **DB migration 003** — `lib/db-migrations/003-document-versions.sql` adds `version TEXT DEFAULT '0.1'` and `version_history JSONB DEFAULT '[]'` to `documents` table. Applied to Neon.
- `lib/admin.ts` — admin detection utility.
- `app/one-pager/OnePagerClient.tsx` — extracted client-side page logic (was `page.tsx`).
- `app/one-pager/components/ProductInfoCustomization.tsx` — paint/texture/logo/material sub-section (migrated from FeatureSelector).
- `app/one-pager/components/VersionHistoryPanel.tsx` — admin-only version history + rollback UI.
- `DELETE /api/documents/[id]/publish` — unpublish endpoint (was missing; now in publish route).

### Changed
- **Section 01 renamed** "Product Description" → "Product Information". Contains: Product Description sub-header + textarea, then Paint/Texture/Logo sub-section.
- **Paint/Logo customization migrated** from Section 05 (`FeatureSelector`) → Section 01 (`ProductInfoCustomization`). `FeatureSelector` no longer takes `customization` or `dispatch` props.
- **`app/one-pager/page.tsx`** is now a server component (resolves `isAdmin` from session, renders `OnePagerClient`).
- **Publish route** bumps version to `1.0` on first publish, `1.x` on re-publish; returns `version` in response.
- **Save Draft** increments draft version (0.1 → 0.2 → ...) and passes new version to API.

## [Unreleased] - 2026-04-27

### Added
- **Feature-gate allowlist** (`config/allowlist.txt`) — number-based per-user feature visibility; `lib/feature-gate.ts` with `getFeaturesForEmail()` / `hasFeature()`; replaces binary `isRDEmail` gate
- **Documents Library spec + plan** — unified dashboard view for One-Pager + PRD documents with tabs, DOCX/HTML download, delete; design: `docs/superpowers/specs/2026-04-27-documents-library-design.md`; plan: `docs/superpowers/plans/2026-04-27-documents-library.md`
- **Documents Library implementation** — unified document library on dashboard with tab filtering (All / One-Pager / PRD), DOCX/HTML download links, and delete support
  - `lib/one-pager-export.ts` — extracted `generateOnePagerDocx` and `generateOnePagerHtml` from export route (reusable lib)
  - `lib/db.ts` — `LibraryDocument` interface, `toLibraryDocument()`, `toPRDLibraryDocument()` mapper functions
  - `lib/prd-db.ts` — `listPRDDocuments(email)`, `softDeletePRDDocument(id)`, `getPRDDocument` now filters `deleted_at IS NULL`
  - `GET /api/documents/[id]/export` — download One-Pager by DB document ID (DOCX or HTML)
  - `DELETE /api/pipeline/prd/[run_id]/delete` — soft-delete a PRD document
  - `DocumentsTable` — rewritten to accept `LibraryDocument[]`, tab bar, DOCX/HTML anchor links, delete button
  - `DashboardShell` — updated to `LibraryDocument[]` state
  - `app/page.tsx` — fetches One-Pager + PRD docs in parallel, merges into unified sorted list
  - 22 new tests across 5 test files (all passing)

### Changed
- **TopBar** renamed from "MRD Producer" → "Documentation Center"
- **PRD Producer dashboard card** — badge changed from "R&D" → "Alpha"; soft-gated (hidden for non-allowlist users, no redirect)
- **Middleware** — removed R&D route blocking; access control is now dashboard-level visibility only
- **`lib/rd-email-gate.ts`** — now reads from `config/allowlist.txt` as fallback when `ALLOWED_RD_EMAILS` env var not set
- **`app/api/one-pager/export/route.ts`** — now imports from `lib/one-pager-export.ts` instead of defining functions inline

---

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-04-23

### Added (PRD Producer — feature/prd-producer)
- **`/prd` route** — R&D-only pipeline to transform a saved One-Pager into a structured engineering PRD
- **4-agent pipeline**: OnePagerAnalystAgent → PRDArchitectAgent (human gate) → PRDWriterAgent → PRDQAAgent
- **Streaming API** (`POST /api/pipeline/prd/start`) — NDJSON event stream with `agent_start/done`, `human_gate`, `section_done`, `pipeline_done` events; 30-min human gate with poll-and-resume
- **Status + Approve endpoints** (`GET/POST /api/pipeline/prd/[run_id]/status|approve`) — skeleton review and approval flow
- **Export endpoint** (`GET /api/pipeline/prd/[prd_id]/export?format=docx|html`) — DOCX (Arial, US Letter, 1" margins) and HTML export
- **3 new Postgres tables**: `pipeline_runs`, `prd_documents`, `prd_frames` (migration: `lib/db-migrations/002-prd-tables.sql`)
- **YAML-driven section config** (`config/prd-sections.yaml`) — 8 PRD sections with prompts editable without code changes
- **R&D email gate** — `isRDEmail()` in middleware; `ALLOWED_RD_EMAILS` env var restricts `/prd` and `/api/pipeline/prd` routes
- **4 UI screens**: Document Picker, Pipeline Progress overlay, Skeleton Review form, PRD Viewer with QA score panel
- **PRD document generator** (`lib/prd-document-generator.ts`) — `generatePRDDocx` and `generatePRDHtml`
- **63 new tests** across agents, API routes, and components (3 AI-dependent skipped by default)

---

## [1.2.0] - 2026-04-06

### Changed (Brand Token Migration — Compulocks R&D AI Design Kit)
- **Green accent colors added** — `--brand-green-dark: #009966` and `--brand-green-light: #1db274` now defined in `styles/tokens/compulocks.css`; all teal `#0f766e` references replaced site-wide
- **IBM Plex fonts removed** — `layout.tsx` no longer imports IBM Plex Sans/Mono; Barlow + Barlow Condensed are now the only fonts loaded
- **Barlow as default `--font-sans`** — `globals.css` default body font changed from IBM Plex to Barlow
- **Background corrected** — `--background` changed from warm beige `#f6f5f1` to brand-spec neutral `#f2f2f2`
- **Typography utility classes** — `.section-heading`, `.slide-title`, `.small-title`, `.paragraph-text`, `.small-text`, `.content-card` added to `compulocks.css` as globals
- **DocumentPreview heading scale** — h1: 36px Barlow Condensed/500, h2: 21px/600, h3: 16px, body: 18px Barlow (was 22px/14px/13px/14px)
- **Competitor card spec** — radius 24px, border 1px #e0e0e0, padding 32px (was 28px/1.5px/14px)
- **One-pager page title** — 36px Barlow Condensed weight 500, capitalize (was ~20px)
- **`brief-helper.css` cleaned** — 7 teal references replaced with brand green, `--accent-strong` → `--accent-hover`

### Plan
- Task 8 (import compulocks.css into globals) — in progress
- Task 9 (visual smoke test + final verification) — pending

---

## [1.1.0] - 2026-03-22

### Added
- **Neon Postgres database** — provisioned with `documents` and `document_embeddings` (pgvector 768-dim, IVFFlat cosine index) tables.
- **`lib/db-client.ts`** — shared `pg` Pool singleton with `query()` and tagged `sql\`\`` helpers. Replaces `@vercel/postgres`.
- **Documents saved on export** — `/api/one-pager/export` calls `createDocument()` fire-and-forget; exported one-pagers now appear in dashboard.
- **GCP migration docs** — `gcp-migration/01-05`, `Dockerfile`, updated GitHub Actions for Cloud Run.

### Fixed
- Migrated `@vercel/postgres` → `pg` (works on Neon, Vercel Postgres, Cloud SQL, local).
- Stale `one-pager-state` tests: `SET_COMPETITOR_PHOTO`/`photoUrl` → `TOGGLE_COMPETITOR_PHOTO`/`photoUrls[]`. 310/310 passing.
- Added `AUTH_SECRET` + `POSTGRES_URL` to Vercel — login server error resolved.

## [1.0.1] - 2026-02-26

### Fixed (One-Pager Generator)
- **Multiple photos per competitor**: Migrated `photoUrl: string` → `photoUrls: string[]` across state, reducer, PhotoPicker, CompetitorInput, page, DocumentPreview, and export route. Toggle-add/remove pattern via `TOGGLE_COMPETITOR_PHOTO` action.
- **Photos broken in preview**: `DocumentPreview` now iterates `photoUrls[]` and renders each via ReactMarkdown `![]()` syntax.
- **Can't add additional competitors**: Added duplicate URL guard in `ADD_COMPETITOR` reducer (early return if URL already exists).
- **Use cases not showing in preview**: Added `useCases` block to `generateMarkdown()` in `DocumentPreview`.
- **Feature popover anchored to page bottom**: Wrapped custom input row in `<div className={styles.chipWrapper}>` so popover is `position: absolute` relative to its trigger, not the page.

### Added (One-Pager Generator)
- Compulocks logo in `DocumentPreview` header (right-aligned, `--op-logo-height: 20px`).
- Logo embedded in DOCX export (ImageRun in document header with tab stop) and HTML export (base64 inline in `.doc-header` div).
- `productName`, `preparedBy`, `userEmail` metadata fields — free-text inputs in form, rendered in preview header and exported to DOCX/HTML.

### Added (Dashboard & Auth)
- Google OAuth authentication via NextAuth.js v5
- Auth middleware protecting all routes except `/login` and `/api/auth/*`
- Branded login page at `/login`
- Vercel Postgres `documents` table schema (`lib/db-schema.sql`)
- Document CRUD helpers in `lib/db.ts` (list, create, update, soft delete)
- Documents API endpoints (`/api/documents` GET/POST, `/api/documents/[id]` DELETE)
- Google Drive sync stub at `/api/drive/sync` (501 placeholder)
- Dashboard homepage at `/` with TopBar, ToolCard grid, DocumentsTable
- `DashboardShell` client component for optimistic delete UI

### Changed
- Merged `feat/one-pager-integrate` → `main`; One-Pager Generator now live on Vercel.
- Merged `feature/unified-dashboard` → `main`; auth + dashboard in main tree.
- MRD form moved to `/mrd`; original `/` is now the dashboard.
- `app/page.tsx`: hard redirect to `/login` when no session.
- `lib/db.ts`: `updateDocument` validates non-empty updates, filters soft-deleted rows, throws on missing row.

## [1.0.0] - 2026-02-23

### Added — One-Pager Generator (`/one-pager`)
- Split-screen layout: guided input left, live document preview right
- 7 input sections: Description, Goal, Where (environment + industry chips), Who (dynamic role chips), Use Cases, Features, Commercials (MOQ + price), Competitors
- M3 Expressive design system: Compulocks brand palette (`#1D1F4A` / `#243469`), Barlow fonts, pill buttons, XL card radius (28px)
- Full dark mode via `--op-*` CSS custom properties in `app/one-pager/one-pager-tokens.css`
- M3 filter chips for all selection inputs (`<button aria-pressed>` — no checkboxes)
- Feature chip palette with Must Have / Nice to Have assignment via popover; side-by-side and stacked frame layouts
- `config/one-pager/standard-features.yaml` — editable chip palette
- `config/one-pager/industry-roles.yaml` — editable industry → role mapping
- Competitor URL extraction: 2-tier scraper (fetch + Schema.org/OpenGraph → Playwright fallback)
- Photo picker per competitor: thumbnails from scraped page, drag-drop upload, or URL link
- AI text expansion for Description, Goal, Use Cases fields
- DOCX + HTML + PDF export with competitor photos embedded
- `lib/scraper/` shared scraper service
- `agent/agents/one-pager/` — CompetitorAnalysisAgent, CompetitorOrchestrator

### Changed
- `app/layout.tsx`: Barlow + Barlow Condensed fonts added
- `/api/one-pager/config` made `force-dynamic`
- `lib/one-pager/config-loader.ts`: normalises YAML string features to `{id, label}` objects

## [0.3.0] - 2026-02-03

### Added
- Document download functionality (Word, PDF, HTML formats)
- Professional document styling following MRD template specs
- `/api/download` endpoint for document conversion
- Download buttons in UI (Word, Print/PDF, HTML)
- Research sources display in UI
- Gemini Google Search grounding for real-time web research
- 12-section MRD structure following Compulocks template

### Changed
- Migrated from `@google/generative-ai` to `@google/genai` SDK
- Replaced Google Custom Search API with Gemini Search grounding
- Updated default model to `gemini-2.5-flash`
- MRD generator now follows exact 12-section template structure
- Only `GOOGLE_API_KEY` required (removed `GOOGLE_SEARCH_ENGINE_ID` dependency)

### Document Features
- US Letter size (8.5" x 11") with 1" margins
- Arial font with proper heading hierarchy (20pt/16pt/13pt/11pt)
- Bullet lists, horizontal rules between sections
- Headers with document title, footers with page numbers
- Print-ready HTML styling for PDF export

## [0.2.0] - 2026-02-03

### Added
- Multi-stage MRD generation pipeline with 5 stages (Parse, Gap Analysis, Clarify, Research, Generate)
- Input sanitization (`lib/sanitize.ts`) to prevent prompt injection attacks
- Gap analyzer skill with question generation (max 2 rounds, 5 questions per round)
- New `/api/workflow` endpoint for stateful MRD generation
- Jest testing infrastructure with 65 tests
- Data schemas for all pipeline stages (`lib/schemas.ts`)
- `references/README.md` documentation

### Changed
- Renamed `refrances/` directory to `references/`
- Fixed duplicate files and chain position comments in reference docs
- Updated `/api/generate` to use input sanitization

### Removed
- Duplicate `05_generate_mrd.md` file

## [0.1.0] - 2026-02-02

### Added
- Initial Next.js 14 web application
- Cross-browser compatibility support (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
- Google Gemini Pro integration for AI-powered MRD generation
- Google Custom Search API integration for market research
- Basic form UI for product concept and target market input
- Template-based MRD fallback when AI unavailable
- CI/CD pipeline with GitHub Actions and Vercel deployment
