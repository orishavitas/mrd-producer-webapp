# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
