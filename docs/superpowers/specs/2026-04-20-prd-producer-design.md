# PRD Producer — Design Spec
**Date:** 2026-04-20
**Branch:** feature/prd-producer
**Status:** Approved — ready for implementation plan

---

## 1. What We're Building

A 4-agent MRD→PRD transformation pipeline that lives at `/prd` in `mrd-producer-webapp`. The user selects a previously saved MRD from a picker, triggers the pipeline, watches streaming progress, reviews and approves the PRD skeleton at a human gate, then downloads the finished PRD as DOCX/HTML/PDF.

This is Phase 1 scope only: no Composer UI, no DevLog, no Monday webhook.

---

## 2. Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trigger | MRD picker — user selects from saved list | MRDs exist in DB; no inline trigger needed |
| Human gate | Enabled at Agent 2 | User reviews PRD skeleton (field strategies) before Agent 3 writes prose |
| Output scope | PRD viewer + DOCX/HTML/PDF export | No Composer, no DevLog this phase |
| DevLog | Skipped entirely | Separate initiative; not blocked on PRD |
| Provider | Gemini primary → Claude fallback | Existing `provider-chain.ts` as-is |
| Storage | New tables: `prd_documents`, `prd_frames`, `pipeline_runs` | Hidden from user-facing dashboard document list |
| Pipeline UX | Streaming with LoadingOverlay progress | 30-60s pipeline justifies live progress; matches MRD generator pattern |

---

## 3. Architecture

### 3.1 Agent Chain

```
[User selects MRD] → POST /api/pipeline/prd/start
       │
       ▼
Agent 1 — MRDIntakeAgent        (temp: 0.1, Gemini primary)
  Extract: product_name, goals, constraints, environments, users, gaps
  Output: MRDIntakeOutput → pipeline_runs.agent_1_output
       │
       ▼
Agent 2 — PRDStructuringAgent   (temp: 0.1)
  Map intake → PRD frame schema
  Per-field strategy: extract | derive | generate | human
  Output: PRDSkeletonOutput → pipeline_runs.agent_2_output
       │
  ┌────┴─────────────────────────────────────┐
  │  HUMAN GATE — polling UI, user approves  │
  │  User may edit skeleton fields before    │
  │  approving. Gate is non-optional.        │
  └────┬─────────────────────────────────────┘
       │
       ▼
Agent 3 — PRDWritingAgent       (temp: 0.2)
  Fill each PRD frame per skeleton instructions
  Produce HTML frames + structured data per frame
  Output: PRDWritingOutput → pipeline_runs.agent_3_output
       │
       ▼
Agent 4 — PRDReviewAgent        (temp: 0.0)
  Validate coverage (≥0.85), quality (≥0.80), no critical gaps
  If gaps: loop Agent 3 on affected frames only (max 2 retries)
  Output: PRDReviewOutput → pipeline_runs.agent_4_output
       │
       ▼
  Save PRD → prd_documents + prd_frames tables
  Return PRD viewer URL to client
```

### 3.2 Agent Inheritance

```
BaseAgent (existing — agent/core/base-agent.ts)
  └── BasePRDAgent (new — agent/agents/prd/base-prd-agent.ts)
        Adds: pipeline_run logging, run_id context
        ├── MRDIntakeAgent      (agent/agents/prd/mrd-intake-agent.ts)
        ├── PRDStructuringAgent (agent/agents/prd/prd-structuring-agent.ts)
        ├── PRDWritingAgent     (agent/agents/prd/prd-writing-agent.ts)
        └── PRDReviewAgent      (agent/agents/prd/prd-review-agent.ts)
```

Never fork `BaseAgent`. Only extend via `BasePRDAgent`.

### 3.3 Model

All 4 agents use `claude-sonnet-4-6` (current). The design docs say `claude-sonnet-4-5` — that is stale. PRD transformation is a structuring task; Opus is not justified.

Gemini primary via `provider-chain.ts`; Claude fallback is automatic.

---

## 4. Data Model

### 4.1 New Tables

```sql
-- One PRD per MRD (regeneration creates new row, old becomes 'superseded')
CREATE TABLE prd_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrd_id        UUID NOT NULL REFERENCES mrd_documents(id),
  status        TEXT NOT NULL DEFAULT 'draft',  -- draft|in_review|approved|superseded
  product_name  TEXT NOT NULL,
  version       TEXT NOT NULL DEFAULT '1.0',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- One row per frame per PRD
CREATE TABLE prd_frames (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id        UUID NOT NULL REFERENCES prd_documents(id),
  frame_type    TEXT NOT NULL,  -- header|overview|goals|scope|environments|requirements|acceptance|assumptions|checklist
  version       TEXT NOT NULL DEFAULT '1.0',
  html          TEXT NOT NULL,
  data          JSONB NOT NULL,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  agent_version TEXT
);

-- One row per pipeline run attempt
CREATE TABLE pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrd_id          UUID NOT NULL,
  prd_id          UUID,
  status          TEXT NOT NULL DEFAULT 'running',  -- running|approved|requires_review|failed
  agent_1_output  JSONB,
  agent_2_output  JSONB,
  agent_3_output  JSONB,
  agent_4_output  JSONB,
  retry_count     INT DEFAULT 0,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);
```

`prd_documents` is intentionally NOT listed in the dashboard `documents` table — it has its own viewer route.

### 4.2 Frame Types (from frame-schema.md)

`header`, `overview`, `goals`, `scope`, `environments`, `requirements`, `acceptance`, `assumptions`, `checklist`

`stage-resolution` and `decision-log` are DevLog-only — not built this phase.

---

## 5. API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/pipeline/prd/mrds` | List saved MRDs for the picker |
| POST | `/api/pipeline/prd/start` | Start pipeline run, return `run_id` + streaming response |
| GET | `/api/pipeline/prd/[run_id]/status` | Poll run status + agent outputs (for human gate) |
| POST | `/api/pipeline/prd/[run_id]/approve` | User approves skeleton; unblocks Agent 3 |
| GET | `/api/pipeline/prd/[prd_id]` | Fetch completed PRD frames for viewer |
| POST | `/api/pipeline/prd/[prd_id]/export` | Export PRD as DOCX / HTML / PDF |

### 5.1 Streaming

`/api/pipeline/prd/start` returns a `ReadableStream` (Next.js `Response` with `ReadableStream` body). Server pushes JSON events:

```typescript
type PipelineEvent =
  | { type: 'agent_start';    agent: 1|2|3|4 }
  | { type: 'agent_complete'; agent: 1|2|3|4; output: unknown }
  | { type: 'human_gate';     run_id: string; skeleton: PRDSkeletonOutput }
  | { type: 'retry';          agent: 3; attempt: number; frames: string[] }
  | { type: 'done';           prd_id: string }
  | { type: 'error';          message: string }
```

Client reads stream via `ReadableStreamDefaultReader`. On `human_gate` event: stream pauses (server awaits approval row in DB). Client shows gate UI. On approval POST: server resumes, emits `agent_start` for Agent 3.

---

## 6. UI

### 6.1 Route Structure

```
app/prd/
  page.tsx              — MRD picker + "Generate PRD" CTA
  [prd_id]/
    page.tsx            — PRD viewer (read-only, frame-by-frame)
  pipeline/
    [run_id]/
      page.tsx          — Pipeline progress + human gate
```

### 6.2 MRD Picker (`/prd`)

- Lists saved MRDs from DB (title, date, product name)
- Single-select; "Generate PRD" button activates on selection
- Uses existing dashboard card/table styles — no new design tokens
- Empty state: "No saved MRDs yet. Generate an MRD first."

### 6.3 Pipeline Progress Page (`/prd/pipeline/[run_id]`)

Reuses `LoadingOverlay` pattern from MRD generator.

Progress checklist items:
1. Reading MRD → extracting intake data (Agent 1)
2. Mapping PRD structure (Agent 2)
3. **[HUMAN GATE]** Review PRD skeleton before writing
4. Writing PRD sections (Agent 3)
5. Reviewing coverage and quality (Agent 4)
6. Saving PRD

On `human_gate` event:
- Checklist pauses at step 3
- Gate UI expands inline: shows PRD skeleton as a table of frame → strategy → source
- User reads, optionally edits field strategies
- "Looks good — continue" button POSTs to `/approve`

On `done` event: redirect to `/prd/[prd_id]`.

### 6.4 PRD Viewer (`/prd/[prd_id]`)

- Renders each frame's `html` string in order
- Left nav: jump-links to each section (`href="#[frame_type]"`)
- Top bar: product name, version, status badge, Export dropdown (DOCX / HTML / PDF)
- Brand tokens apply: Barlow fonts, `--brand-primary` navy, `--brand-green-dark` for CTAs
- Read-only — no inline editing this phase

### 6.5 Export

Reuses `lib/document-generator.ts` pattern. PRD export produces:
- **DOCX**: frame HTML → docx sections (same approach as One-Pager export)
- **HTML**: full branded page with frames assembled
- **PDF**: print-ready HTML (same as One-Pager)

---

## 7. Error Handling

| Scenario | Behavior |
|----------|----------|
| Agent 1: confidence < 0.7 | Log warning; surface to user as yellow banner; allow continue |
| Agent 1: gaps > 5 | Halt pipeline; show gap list; suggest MRD enrichment before retry |
| Agent 2: human_flags > 3 | Surface warning in gate UI; user must explicitly confirm |
| Agent 4: critical gaps remain after 2 retries | Surface gap report to user; offer "Export anyway" or "Abandon" |
| Provider failure | `provider-chain.ts` handles fallback automatically; no special handling needed |
| Network drop during stream | Client reconnects via status poll endpoint; stream resumes from last known state |

---

## 8. File Layout

```
agent/agents/prd/
  base-prd-agent.ts
  mrd-intake-agent.ts
  prd-structuring-agent.ts
  prd-writing-agent.ts
  prd-review-agent.ts

app/prd/
  page.tsx                     # MRD picker
  page.module.css
  pipeline/[run_id]/
    page.tsx                   # Progress + human gate
    page.module.css
  [prd_id]/
    page.tsx                   # PRD viewer
    page.module.css

app/api/pipeline/prd/
  mrds/route.ts
  start/route.ts
  [run_id]/
    status/route.ts
    approve/route.ts
  [prd_id]/
    route.ts
    export/route.ts

lib/prd/
  pipeline-orchestrator.ts    # Drives agent 1→2→3→4, handles retry loop
  prd-db.ts                   # DB helpers: createPRD, savePRDFrames, createPipelineRun, updatePipelineRun

scripts/
  migrate-prd-schema.sql      # Creates prd_documents, prd_frames, pipeline_runs tables

__tests__/
  agent/agents/prd/           # One test file per agent
  lib/prd/                    # Orchestrator + DB helper tests
  app/api/pipeline/prd/       # Route handler tests
```

---

## 9. Out of Scope (Phase 1)

- DevLog artifact system
- Composer UI (frame selection by audience)
- Monday.com webhook trigger (`/api/pipeline/prd/start` is the entry point for now)
- PRD inline editing
- PRD version history / diff view
- Real-time collaboration

---

## 10. Implementation Order

1. DB schema (`migrate-prd-schema.sql`)
2. `BasePRDAgent` + 4 agent files (backend, no UI)
3. `pipeline-orchestrator.ts` + `prd-db.ts`
4. API routes (start, status, approve, viewer, export)
5. `/prd` MRD picker page
6. `/prd/pipeline/[run_id]` progress + gate page
7. `/prd/[prd_id]` viewer page
8. Export (DOCX/HTML/PDF)
9. Tests
