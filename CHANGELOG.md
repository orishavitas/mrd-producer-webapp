# Changelog

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
