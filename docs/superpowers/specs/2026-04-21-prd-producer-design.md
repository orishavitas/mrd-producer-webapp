# PRD Producer — Design Spec

**Version:** 1.0.0  
**Date:** 2026-04-21  
**Author:** Ori Shavit  
**Status:** Approved — ready for implementation planning

---

## Overview

PRD Producer is a 4-agent pipeline that transforms a saved **One-Pager** document into a structured **Product Requirements Document (PRD)** in engineering-handoff format. It lives at `/prd` and is restricted to R&D personnel only.

Pipeline: **One-Pager → PRD** (the One-Pager is the sole source of truth; the original MRD tool is legacy and not used as input).

---

## Access Control

- Route `/prd` is R&D-only.
- Gate: Next.js middleware checks the authenticated user's email against `ALLOWED_RD_EMAILS` environment variable (comma-separated list).
- Non-R&D users receive a 403 page.
- No DB role column needed — env var allowlist is sufficient for current team size.

---

## Architecture

### Entry Point

`/prd` — standalone R&D-only route. Accepts optional `?documentId=` query param to deep-link from a saved One-Pager document (pre-selects and auto-starts the pipeline).

### 4-Agent Chain

All agents live in `agent/agents/prd/`. Provider: Gemini primary, Claude fallback via existing `lib/providers/` chain (no changes to provider layer).

| # | Agent | Role | Output | Est. time |
|---|-------|------|--------|-----------|
| 1 | `OnePagerAnalystAgent` | Reads saved One-Pager from DB, normalises all fields into a typed summary | `OnePagerSummary` | ~5s |
| 2 | `PRDArchitectAgent` | Generates PRD skeleton — section strategies + writing directives | `PRDSkeleton` | ~10s |
| — | **HUMAN GATE** | User reviews + edits skeleton before Agent 3 proceeds | — | variable |
| 3 | `PRDWriterAgent` | Writes all 8 PRD sections in parallel using approved skeleton | `PRDFrame[]` | ~20s |
| 4 | `PRDQAAgent` | Reviews full draft, produces quality score + inline suggestions | `QAReport` | ~10s |

Total pipeline (excluding human gate pause): ~45s.

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/pipeline/prd/start` | Starts pipeline, returns `ReadableStream` of NDJSON progress events |
| `GET` | `/api/pipeline/prd/[run_id]/status` | Polls run state (used during human gate) |
| `POST` | `/api/pipeline/prd/[run_id]/approve` | Submits approved/edited skeleton, resumes pipeline |
| `GET` | `/api/pipeline/prd/[run_id]/export` | Generates DOCX/HTML/PDF on demand |

### Streaming

`ReadableStream` pushes newline-delimited JSON events:
```jsonl
{"type":"agent_start","agent":"analyst"}
{"type":"agent_done","agent":"analyst"}
{"type":"human_gate","run_id":"...","skeleton":{...}}
{"type":"agent_start","agent":"writer","section":"overview"}
{"type":"section_done","section":"overview","content":"..."}
{"type":"pipeline_done","prd_document_id":"..."}
```

Pipeline pauses at `human_gate`. UI switches to Skeleton Review screen. Stream resumes after `approve` call.

---

## Data Model

3 new Postgres tables. No changes to existing `documents` table (One-Pager documents stored there with `tool_type = 'one-pager'`).

### `pipeline_runs`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
source_document_id uuid NOT NULL REFERENCES documents(id),
status          text NOT NULL CHECK (status IN ('running','awaiting_approval','approved','completed','failed')),
skeleton_json   jsonb,
agent_progress  jsonb,
created_by      text NOT NULL,
created_at      timestamptz NOT NULL DEFAULT now(),
updated_at      timestamptz NOT NULL DEFAULT now()
```

### `prd_documents`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
run_id              uuid NOT NULL REFERENCES pipeline_runs(id),
source_document_id  uuid NOT NULL REFERENCES documents(id),
product_name        text NOT NULL,
qa_score            integer CHECK (qa_score BETWEEN 0 AND 100),
qa_suggestions      jsonb,
created_by          text NOT NULL,
created_at          timestamptz NOT NULL DEFAULT now(),
updated_at          timestamptz NOT NULL DEFAULT now()
```

### `prd_frames`
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
prd_document_id   uuid NOT NULL REFERENCES prd_documents(id),
section_key       text NOT NULL,
section_order     integer NOT NULL,
content           text NOT NULL,
created_at        timestamptz NOT NULL DEFAULT now()
```

---

## PRD Sections

8 sections matching the Compulocks engineering-handoff format (based on EMV Bracket PRD reference):

| # | Section key | One-Pager source fields |
|---|------------|------------------------|
| 1 | `overview` | `description`, `expandedDescription` |
| 2 | `goals` | `goal`, `expandedGoal` |
| 3 | `design_scope` | `context.environments`, `customization` |
| 4 | `target_environments` | `useCases`, `expandedUseCases`, `context.industries` |
| 5 | `requirements` | `features.mustHave`, `features.niceToHave`, `audience` |
| 6 | `acceptance_criteria` | derived from `features.mustHave` + goals |
| 7 | `assumptions` | `commercials` (MOQ, price), competitor data |
| 8 | `feature_checklist` | all features, goals vs required vs nice-to-have table |

Section prompts and gap rules are YAML-driven: `config/prd-sections.yaml`. Non-developers can edit prompts without code changes.

---

## Agent TypeScript Contracts

```typescript
interface OnePagerSummary {
  productName: string;
  description: string;
  goal: string;
  useCases: string;
  environments: string[];
  industries: string[];
  audience: string[];
  mustHaveFeatures: string[];
  niceToHaveFeatures: string[];
  moq: string;
  targetPrice: string;
  competitors: { brand: string; productName: string; description: string; cost: string }[];
  customization: { paint: string; logoColors: string[] };
}

interface PRDSkeletonSection {
  sectionKey: string;
  sectionTitle: string;
  strategy: string;
  writingDirective: string;
}

type PRDSkeleton = PRDSkeletonSection[];

interface PRDFrame {
  sectionKey: string;
  sectionOrder: number;
  content: string;
}

interface QAReport {
  score: number; // 0–100
  suggestions: { sectionKey: string; note: string }[];
}
```

---

## UI/UX — 4 Screens

### Screen 1: Document Picker
- Lists user's saved/published One-Pager documents (cards: product name, prepared-by, date).
- "Generate PRD" button on each card launches pipeline.
- `?documentId=` deep-link pre-selects a document and auto-starts.

### Screen 2: Pipeline Progress
- Full-screen LoadingOverlay (same pattern as MRD Generator).
- Live checklist: Analyzing One-Pager → Building skeleton → **Awaiting review** (pauses) → Writing PRD → QA Review.
- Stream events drive checklist state in real time.

### Screen 3: Skeleton Review (Human Gate)
- Agent 2 skeleton rendered as editable form: section name + strategy textarea per section.
- User edits strategies inline if needed.
- "Approve & Generate PRD" submits to `/approve` and resumes stream.

### Screen 4: PRD Viewer
- Full rendered PRD (8 sections, Barlow fonts, Compulocks brand tokens).
- QA score badge (0–100) + collapsible suggestions panel.
- Export: DOCX / HTML / PDF — same `lib/document-generator.ts` pattern, extended for PRD.
- "Regenerate" button restarts pipeline from same One-Pager source.

---

## Export

DOCX/HTML generated on demand from `prd_frames`. Uses existing `lib/document-generator.ts` — add PRD-specific section renderers. Arial font, US Letter, 1" margins (matches existing exports). PDF via browser print.

---

## File Structure

```
app/prd/
  page.tsx                        # Document picker (Screen 1)
  pipeline/page.tsx               # Progress + skeleton review (Screens 2+3)
  [prd_id]/page.tsx               # PRD viewer (Screen 4)
  components/
    DocumentPickerCard.tsx
    PipelineOverlay.tsx
    SkeletonReviewForm.tsx
    PRDViewer.tsx
    QAPanel.tsx

agent/agents/prd/
  one-pager-analyst-agent.ts
  prd-architect-agent.ts
  prd-writer-agent.ts
  prd-qa-agent.ts
  prd-orchestrator.ts

app/api/pipeline/prd/
  start/route.ts
  [run_id]/status/route.ts
  [run_id]/approve/route.ts
  [run_id]/export/route.ts

config/
  prd-sections.yaml

lib/
  prd-document-generator.ts      # PRD-specific export renderer
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ALLOWED_RD_EMAILS` | Yes | Comma-separated R&D email allowlist for `/prd` access |

---

## Error Handling

- Agent failure → `pipeline_runs.status = 'failed'`, error surfaced in UI with retry option.
- Human gate timeout — no timeout; run stays `awaiting_approval` until user acts or navigates away.
- Partial write failure (Agent 3) — save completed frames, mark failed sections, allow re-run of failed sections only.
- Missing One-Pager fields — Agent 1 surfaces a completeness warning before pipeline starts; user can cancel and complete the One-Pager first.

---

## Testing

- Unit tests for all 4 agents (AI calls skipped by default, mocked `OnePagerSummary` fixtures).
- Integration tests for all 4 API endpoints.
- Component tests for `SkeletonReviewForm`, `PRDViewer`, `QAPanel`.
- No E2E tests in this phase.

---

## Out of Scope (this phase)

- DevLog — not built.
- Monday.com webhook trigger — wired later.
- Composer UI — not built.
- Multi-user collaboration on skeleton review.
- PRD versioning / diff view.
