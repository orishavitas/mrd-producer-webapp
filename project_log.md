# MRD Producer — Project Log

Human-readable log of development progress, decisions, and session summaries.

---

## 2026-02-19 — One-Pager Generator: Rapid Prototype

**Branch:** `feature/one-pager`
**Session goal:** Design and build a guided 7-section product one-pager tool.

### What was built

A new feature at `/one-pager` — a guided product specification tool with split-screen layout (inputs left, live document preview right). Seven sections:

1. **Description** — free text + optional AI expansion (collapsible panel below button)
2. **Goal** — same pattern as Description
3. **Where** — two checkbox groups: Environment + Industry (from YAML config)
4. **Who** — dynamic checkboxes populated by selected industries from a YAML mapping file + custom role entry
5. **Features** — chip/tag inputs for Must-Have and Nice-to-Have
6. **Commercials** — MOQ + Target Price text fields
7. **Competitors** — URL input, AI extracts brand/product/description/cost into compact cards

### Key decisions

- **YAML config for industry/role mapping** (`config/one-pager/industry-roles.yaml`): user can edit this file to add industries and roles without touching code. TypeScript loader provides type safety.
- **AI is opt-in only**: preview always shows raw text. AI expand is only called when user clicks "Expand" button. Saves tokens and API calls.
- **Reused patterns** from Brief Helper: split-screen layout, sessionStorage persistence, React Context + useReducer state management.
- **No start page / batch extraction**: unlike Brief Helper and MRD Generator, the one-pager is direct — user fills sections manually with guided inputs. No initial AI processing step.

### Files created (25 files, ~2,000 lines)

**Config & Loader:**
- `config/one-pager/industry-roles.yaml` — 9 industries, 6 environments, ~50 roles
- `lib/one-pager/config-loader.ts` — cached YAML loader

**State & Context:**
- `app/one-pager/lib/one-pager-state.ts` — 16-action reducer
- `app/one-pager/lib/one-pager-context.tsx` — React context + sessionStorage

**API Endpoints:**
- `app/api/one-pager/config/route.ts` — serves industry/role config to client
- `app/api/one-pager/expand/route.ts` — AI text expansion
- `app/api/one-pager/extract-competitor/route.ts` — URL-based competitor data extraction

**UI Components (7 + 7 CSS modules):**
- SplitLayout, TextFieldWithExpand, CheckboxGroup, DynamicRoleSelector, ChipInput, CompetitorInput, DocumentPreview

**Page:**
- `app/one-pager/page.tsx` — wires all 7 sections together

**Tests:**
- `__tests__/lib/one-pager/config-loader.test.ts` — 6 tests passing
- `__tests__/app/one-pager/lib/one-pager-state.test.ts` — 15 tests passing

**Docs:**
- `docs/plans/2026-02-19-one-pager-generator-design.md`
- `docs/plans/2026-02-19-one-pager-implementation.md`

### Commits

1. `feat: add one-pager foundation - config, state, context` — Phase 1
2. `feat: add one-pager API endpoints, UI components, and main page` — Phases 2-4
3. `docs: add one-pager design doc, implementation plan, and references`

### Next steps

- Smoke test in browser (`npm run dev` → `/one-pager`)
- Fix any build/runtime issues
- Add DOCX export endpoint
- Add "AI Research" button to competitor section
- Add to landing page when merging to main
- Consider adding competitor image fetching
