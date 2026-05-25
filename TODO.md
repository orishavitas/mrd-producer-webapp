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

## Documents Library ✅ COMPLETE

Plan: `docs/superpowers/plans/2026-04-27-documents-library.md`
Spec: `docs/superpowers/specs/2026-04-27-documents-library-design.md`

- [x] Task 1 — Add `listPRDDocuments` to `lib/prd-db.ts`
- [x] Task 2 — Add `LibraryDocument` type + mapper functions to `lib/db.ts`
- [x] Task 3 — `GET /api/documents/[id]/export` — One-Pager download by ID
- [x] Task 4 — `DELETE /api/pipeline/prd/[run_id]/delete` + `softDeletePRDDocument`
- [x] Task 5 — Upgrade `DocumentsTable` with tabs + DOCX/HTML download buttons
- [x] Task 6 — Wire dashboard to fetch both sources, unified `LibraryDocument[]`
- [x] Task 7 — Final verification + push

> **Note:** Before deploying, run this migration in Neon console:
> ```sql
> ALTER TABLE prd_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
> ```

## One-Pager v1.4.0 — Ready to Deploy ✅

Built 2026-05-14. DB migration applied. **Needs commit + push.**

- [x] Section 01 renamed "Product Information", sub-header "Product Description"
- [x] Paint/Texture/Logo migrated from Section 05 → Section 01 (ProductInfoCustomization)
- [x] "Clear" paint finish option (overrides colors)
- [x] Material field (optional free text)
- [x] Footnotes section (end of form)
- [x] Version system: 0.x draft / 1.x published, badge in bar, auto-increment on save
- [x] Version history: PATCH snapshots old content, max 20 entries
- [x] Rollback API + VersionHistoryPanel (admin-only)
- [x] Admin gate: lib/admin.ts, ADMIN_EMAILS env var, server component prop
- [x] DB migration 003 applied to Neon
- [ ] **NEXT: commit + git push to deploy to Vercel**

## Future

- Dark mode brand color variants for green tokens
- Add slogan "DISPLAY. SECURE. ENGAGE." to appropriate UI locations
- Phase 6: RAG analytics dashboard, embedding refresh cron
- Export: render footnotes + material in DOCX/HTML export
- One-Pager: track-changes diff view (show what changed between versions)
