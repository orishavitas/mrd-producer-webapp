# TODO

## Brand Token Migration (Sprint 2026-04-06)

Plan: `docs/superpowers/plans/2026-04-06-compulocks-brand-token-migration.md`

- [x] Task 1 — Extend `compulocks.css`: green tokens, fix surface, add utility classes
- [x] Task 2 — `globals.css`: replace teal accent, Barlow as default font, fix background
- [x] Task 3 — `layout.tsx`: remove IBM Plex, add Barlow weight 600
- [x] Task 4 — `one-pager-tokens.css`: align accent, card, surface tokens
- [x] Task 5 — `CompetitorInput.module.css`: card radius/border/padding to spec
- [x] Task 6 — `DocumentPreview.module.css`: heading sizes, 18px body, image radius 12px
- [x] Task 7 — `page.module.css`: page title 36px Barlow Condensed
- [x] Task 8 — Import `compulocks.css` into `globals.css`, verify build + tests
- [x] Task 9 — Visual smoke test across all routes, confirm green buttons + card styles

## PRD Producer (feature/prd-producer — COMPLETE ✅)

Released as v1.3.0 (2026-04-23). All 15 implementation tasks done. Pending: merge to main.

- [x] Complete brainstorming session
- [x] Write design spec to `docs/superpowers/specs/2026-04-21-prd-producer-design.md`
- [x] Create implementation plan via writing-plans skill
- [x] DB migration: `lib/db-migrations/002-prd-tables.sql` (`pipeline_runs`, `prd_documents`, `prd_frames`)
- [x] Implement 4 PRD agents in `agent/agents/prd/` (analyst, architect, writer, QA)
- [x] Implement pipeline orchestrator + streaming API (`/api/pipeline/prd/start`)
- [x] Status + Approve endpoints (`/api/pipeline/prd/[run_id]/status|approve`)
- [x] Export endpoint (`/api/pipeline/prd/[run_id]/export`)
- [x] R&D email gate (`lib/rd-email-gate.ts`, middleware)
- [x] Build `/prd` route — One-Pager document picker UI
- [x] Build Agent 2 human gate review UI (SkeletonReviewForm)
- [x] Build PRD viewer + export (PRDViewer, QAPanel)
- [x] PRD document generator (`lib/prd-document-generator.ts`)
- [x] 63 tests across agents, API routes, and components

---

## Phase 5 RAG Activation (deferred)

- [ ] Task 5.1 — Run pgvector migration (`scripts/migrate-pgvector.sql`)
- [ ] Task 5.2 — Share Google Sheet with service account
- [ ] Task 5.3 — Run setup-sheet endpoint
- [ ] Task 5.4 — Run RAG backfill endpoint

## Future

- Dark mode brand color variants for green tokens
- Add slogan "DISPLAY. SECURE. ENGAGE." to appropriate UI locations
- Phase 6: RAG analytics dashboard, embedding refresh cron
