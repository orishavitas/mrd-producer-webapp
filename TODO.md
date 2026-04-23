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

## PRD Producer (feature/prd-producer — next up)

Design decisions locked:
- Trigger: MRD picker (user selects saved MRD from list)
- Human gate: ENABLED at Agent 2 (skeleton review before writing)
- Output: PRD viewer + DOCX/HTML/PDF export (no Composer, no DevLog)
- Provider: Gemini primary, Claude fallback (existing chain)
- Storage: New tables — `prd_documents`, `prd_frames`, `pipeline_runs`
- Pipeline UX: Streaming with LoadingOverlay progress (Option B)

Next action: Resume brainstorming → write design spec → invoke writing-plans

- [ ] Complete brainstorming session (next session)
- [ ] Write design spec to `docs/superpowers/specs/2026-04-20-prd-producer-design.md`
- [ ] Create implementation plan via writing-plans skill
- [ ] Implement DB schema extension (`prd_documents`, `prd_frames`, `pipeline_runs`)
- [ ] Implement 4 PRD agents in `agent/agents/prd/`
- [ ] Implement pipeline orchestrator + streaming API
- [ ] Build `/prd` route — MRD picker UI
- [ ] Build Agent 2 human gate review UI
- [ ] Build PRD viewer + export

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
