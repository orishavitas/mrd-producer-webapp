# System Engineer Role File
# Infrastructure · Database · API Contracts · Integration

<!-- @MENTOR:CONTEXT Read this after CLAUDE.md and pipeline-logic-human.md.
     This file owns the infrastructure layer. Nothing gets built until the
     schema is locked and the API contracts are defined. -->

---

## YOUR SCOPE

You own:
- Database schema extensions (Neon PostgreSQL)
- API endpoint contracts (Next.js App Router)
- n8n orchestration workflow
- Monday.com webhook integration
- Environment configuration
- Service account setup (Google Drive, if needed)

You do NOT own:
- Agent prompt engineering (backend)
- UI components (frontend)
- Frame HTML templates (UI/UX)

---

## FIRST TASK: TEST SUITE AUDIT

<!-- @MENTOR:GUARD Do this before any schema work. -->

The `mrd-producer-webapp` repo has 535 tests with ~148 failing.
Before extending the schema, run:

```bash
cd mrd-producer-webapp
pnpm test 2>&1 | grep "FAIL" > /tmp/failing-tests.txt
cat /tmp/failing-tests.txt
```

Categorize failures:
1. **Shared infra tests** (DB, provider layer, base agents) — must fix before building
2. **MRD-specific tests** — lower priority, don't block this branch
3. **Config/env tests** — likely missing `.env.test` values

Report category counts before proceeding with schema extension.

---

## DATABASE SCHEMA EXTENSION

### New Tables

```sql
-- PRD Documents
CREATE TABLE prd_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrd_id          UUID NOT NULL REFERENCES mrd_documents(id),
  product_name    TEXT NOT NULL,
  version         TEXT NOT NULL DEFAULT '1.0',
  status          TEXT NOT NULL DEFAULT 'draft',
  -- status: draft | in_review | approved | superseded
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRD Frames (one row per frame per document)
CREATE TABLE prd_frames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id          UUID NOT NULL REFERENCES prd_documents(id) ON DELETE CASCADE,
  frame_type      TEXT NOT NULL,
  version         TEXT NOT NULL DEFAULT '1.0.0',
  html            TEXT NOT NULL,
  data_json       JSONB NOT NULL,
  agent_version   TEXT,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DevLog Documents
CREATE TABLE devlog_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id          UUID NOT NULL REFERENCES prd_documents(id),
  mrd_id          UUID NOT NULL REFERENCES mrd_documents(id),
  product_name    TEXT NOT NULL,
  stages_json     JSONB NOT NULL,       -- stage definitions array
  feature_baseline_json JSONB NOT NULL, -- PRD checklist snapshot at spawn time
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DevLog Entries (append-only, one row per status update or log entry)
CREATE TABLE devlog_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devlog_id       UUID NOT NULL REFERENCES devlog_documents(id),
  entry_type      TEXT NOT NULL,
  -- entry_type: status_change | manual_log | stage_complete
  stage_id        TEXT NOT NULL,
  feat_id         TEXT,               -- e.g. "R.1", null for non-feature entries
  status          TEXT,               -- achieved | exceeded | partial | deferred | dropped | pending
  prev_status     TEXT,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  entered_by      TEXT,               -- user or agent identifier
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pipeline Run Log (audit trail for every agent chain execution)
CREATE TABLE pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrd_id          UUID NOT NULL,
  prd_id          UUID,               -- null until PRD is created
  status          TEXT NOT NULL,
  -- status: running | approved | failed | requires_review
  agent_1_output  JSONB,
  agent_2_output  JSONB,
  agent_3_output  JSONB,
  agent_4_output  JSONB,
  coverage_score  NUMERIC(4,3),
  quality_score   NUMERIC(4,3),
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
```

### Drizzle Schema File
Create: `src/db/schema/prd.ts`
Pattern: match existing `src/db/schema/mrd.ts` conventions exactly.

### Indexes
```sql
CREATE INDEX idx_prd_documents_mrd_id ON prd_documents(mrd_id);
CREATE INDEX idx_prd_frames_prd_id ON prd_frames(prd_id);
CREATE INDEX idx_prd_frames_type ON prd_frames(frame_type);
CREATE INDEX idx_devlog_entries_devlog_id ON devlog_entries(devlog_id);
CREATE INDEX idx_devlog_entries_created ON devlog_entries(created_at DESC);
CREATE INDEX idx_pipeline_runs_mrd_id ON pipeline_runs(mrd_id);
```

---

## API CONTRACTS

### POST /api/pipeline/start
Triggers the full MRD→PRD agent chain.

```typescript
// Request
{ mrd_id: string }

// Response — success
{
  prd_id: string,
  run_id: string,
  status: 'approved' | 'requires_review',
  coverage_score: number,
  quality_score: number,
  gaps: Gap[],           // empty if approved
  devlog_id: string      // spawned if approved
}

// Response — failure
{ error: string, run_id: string, stage: 'agent_1' | 'agent_2' | 'agent_3' | 'agent_4' }
```

### GET /api/prd/[id]
Fetch a PRD with all frames.

```typescript
// Response
{
  prd: PRDDocument,
  frames: FrameRecord[],
  mrd_id: string,
  devlog_id: string | null
}
```

### GET /api/devlog/[id]
Fetch a DevLog with all entries.

```typescript
// Response
{
  devlog: DevLogDocument,
  entries: DevLogEntry[],
  feature_baseline: FeatureChecklistItem[],
  stages: Stage[]
}
```

### POST /api/devlog/[id]/entry
Append an entry to the decision log. (Append-only — no update/delete endpoints.)

```typescript
// Request
{
  stage_id: string,
  feat_id?: string,
  status?: StatusValue,
  title: string,
  body: string,
  entered_by: string
}
```

### POST /api/frames/compose
Assemble selected frames into a single HTML document.

```typescript
// Request
{
  document_ids: Array<{ doc_type: 'mrd'|'prd'|'devlog', doc_id: string }>,
  frame_types: FrameType[],   // which frames to include
  audience: string,           // for default template selection
  include_nav: boolean
}

// Response
{ html: string }   // complete composited HTML page
```

---

## N8N WORKFLOW

### Trigger: MRD Approved
```
Webhook: Monday.com → item column "Status" changes to "MRD Approved"
  → Extract: item_id, mrd_id (from item's linked field)
  → POST {mrd_id} to /api/pipeline/start
  → On success (approved):
      → Update Monday item: Status = "PRD Ready"
      → Add update to Monday item: "PRD generated. Coverage: [score]"
  → On requires_review:
      → Update Monday item: Status = "PRD Review Needed"
      → Add update: "PRD gaps detected. Review required: [gap list]"
  → On failure:
      → Update Monday item: Status = "Pipeline Error"
      → Add update: "Pipeline failed at [stage]: [error]"
```

### Environment Variables Required
```bash
# Add to .env.local and Vercel project settings
MONDAY_WEBHOOK_SECRET=          # for signature verification
MONDAY_API_TOKEN=               # existing — confirm it's set
PIPELINE_HUMAN_REVIEW_GATE=false  # set true to pause between Agent 2 and 3
PRD_COVERAGE_THRESHOLD=0.85     # min coverage score for approval
PRD_QUALITY_THRESHOLD=0.80      # min quality score for approval
```

---

## INTEGRATION WITH MRD-PRODUCER-WEBAPP

### What to Reuse (Do Not Touch)
- `src/lib/ai/provider.ts` — provider abstraction, use as-is
- `src/db/client.ts` — Neon connection, use as-is
- `src/lib/export/` — HTML/DOCX/PDF pipeline, extend do not fork
- `src/lib/agents/base.ts` — agent base class, extend for PRD agents

### What to Extend
- `src/db/schema/` — add `prd.ts` and `devlog.ts`
- `src/app/api/` — add `pipeline/`, `prd/`, `devlog/`, `frames/` routes
- `src/lib/agents/` — add `prd/` subdirectory

### What Is New
- `src/lib/agents/prd/` — all four PRD agents
- `src/components/prd/` — PRD frame components
- `src/components/devlog/` — DevLog components
- `src/components/composer/` — frame composer UI

---

## MIGRATION PLAN

1. Run test audit (see First Task above)
2. Fix any shared infra test failures
3. Run `pnpm drizzle-kit generate` with new schema files
4. Run `pnpm drizzle-kit migrate` against dev Neon instance
5. Verify all existing MRD tests still pass
6. Hand off to backend dev to scaffold agent files
