# pipeline-logic.md — Agentic Reference
# MRD→PRD Agent Chain · Prompt Contracts · Tool Definitions

<!-- @MENTOR:CONTEXT This file is T1 for agent sessions. Load after CLAUDE.md.
     It defines the executable logic of the pipeline — prompt contracts,
     input/output schemas, validation rules, and loop conditions. -->

---

## AGENT 1 — MRD INTAKE

### Purpose
Extract structured intake data from a completed MRD record. Normalize
MRD content into a typed JSON object that downstream agents consume.

### Input Contract
```typescript
interface MRDIntakeInput {
  mrd_id: string;           // UUID from mrd_documents table
  mrd_json: MRDDocument;    // Full MRD JSON from DB
  product_type: string;     // e.g. "hardware_accessory" | "enclosure" | "mount"
}
```

### System Prompt
```
You are a product requirements analyst. Your job is to extract structured
data from a completed Market Requirements Document (MRD) to prepare it
for PRD generation.

Extract the following fields exactly as specified in the output schema.
Do not infer, generate, or embellish — only extract what is explicitly
stated in the MRD. If a field has no corresponding MRD content, set it
to null and flag it in the gaps array.

Return ONLY valid JSON matching the MRDIntakeOutput schema. No preamble.
```

### Output Contract
```typescript
interface MRDIntakeOutput {
  product_name: string;
  product_type: 'hardware_accessory' | 'enclosure' | 'mount' | 'stand' | 'other';
  one_line_description: string;
  target_environments: string[];
  primary_users: string[];
  goals: Array<{
    id: string;          // e.g. "G.1"
    text: string;
    priority: 'must' | 'nice';
  }>;
  market_constraints: string[];
  competitive_context: string | null;
  existing_ecosystem: string[];   // Compulocks products this integrates with
  gaps: string[];                 // Fields with no MRD coverage → Agent 3 must generate
  confidence: number;             // 0–1, agent's confidence in extraction completeness
}
```

### Validation Rules
- `goals.length >= 3` — flag if fewer
- `confidence < 0.7` → log warning, surface to user before proceeding
- `gaps.length > 5` → halt pipeline, request MRD enrichment
- All `goal.id` values must follow pattern `/^[GR]\.\d+$/`

### Tool Calls
- `db.mrd_documents.findUnique({ where: { id: mrd_id } })` — fetch MRD
- `log.pipeline_event({ stage: 'intake', mrd_id, confidence, gaps })` — audit log

---

## AGENT 2 — PRD STRUCTURING

### Purpose
Map MRD intake JSON to the PRD frame schema. Determine which sections
require AI generation vs. direct extraction. Output a PRD skeleton with
per-field instructions that Agent 3 executes.

### Input Contract
```typescript
interface PRDStructuringInput {
  intake: MRDIntakeOutput;     // from Agent 1
  prd_template: PRDFrameSchema; // from frame-schema.md
  product_type: string;
}
```

### System Prompt
```
You are a PRD architect. Your job is to map extracted MRD data onto a
PRD frame schema, determining the source and generation strategy for
every field.

For each PRD field, assign one of:
  - "extract": content comes directly from MRD (provide the source field)
  - "derive": content is logically derivable from MRD data (provide derivation logic)
  - "generate": content must be generated from context (provide a specific prompt)
  - "human": content requires human input (flag with reason)

Return ONLY valid JSON matching PRDSkeletonOutput. No preamble.
```

### Output Contract
```typescript
interface PRDSkeletonOutput {
  prd_id: string;              // generated UUID
  mrd_id: string;              // parent MRD
  product_name: string;
  version: string;             // "1.0"
  frames: Array<{
    frame_type: FrameType;     // see frame-schema.md
    fields: Array<{
      field_id: string;
      strategy: 'extract' | 'derive' | 'generate' | 'human';
      source?: string;         // MRD field path if extract/derive
      prompt?: string;         // generation prompt if generate
      human_note?: string;     // reason if human
      value?: string;          // pre-filled if extract/derive
    }>;
  }>;
  human_flags: string[];       // fields requiring human review before finalizing
}
```

### Validation Rules
- Every PRD frame type must be represented
- `human_flags.length > 3` → surface warning to user
- All `frame_type` values must match the enum in `methodology/frame-schema.md`

---

## AGENT 3 — PRD WRITING

### Purpose
Fill each PRD field per the skeleton's instructions. Produce complete,
R&D-ready PRD content. HTML frames are the output format.

### Input Contract
```typescript
interface PRDWritingInput {
  skeleton: PRDSkeletonOutput;      // from Agent 2
  intake: MRDIntakeOutput;          // from Agent 1 (grounding context)
  mrd_full: MRDDocument;            // full MRD for deep reference
  style_guide: string;              // from methodology/frame-schema.md
}
```

### System Prompt
```
You are a senior product manager writing a Product Requirements Document
for a hardware product at Compulocks. You write for an R&D and mechanical
engineering audience — precise, unambiguous, and complete.

You are filling a PRD skeleton. For each field:
  - "extract" fields: use the provided value exactly
  - "derive" fields: apply the derivation logic to the MRD content
  - "generate" fields: follow the specific prompt provided in the skeleton

Rules:
  - Requirements must be testable. Avoid "should", prefer "must" or "shall".
  - Physical specs must include units (mm, kg, N, etc.)
  - Every requirement gets an ID in format [R.N] or [G.N]
  - Acceptance criteria must be binary — pass/fail, not subjective
  - Do not introduce content not grounded in the MRD unless the field strategy is "generate"

Return structured JSON matching PRDWritingOutput. No preamble.
```

### Output Contract
```typescript
interface PRDWritingOutput {
  prd_id: string;
  frames: Array<{
    frame_type: FrameType;
    html: string;           // complete HTML for this frame (data-frame attribute set)
    data: Record<string, unknown>; // structured data version of same content
  }>;
  feature_checklist: Array<{
    id: string;
    name: string;
    priority: 'must' | 'nice';
    applied: 'yes' | 'limited' | 'no' | 'pending';
    notes: string;
  }>;
  word_count: number;
  generation_notes: string[]; // anything Agent 3 flagged during generation
}
```

### Model Config
```typescript
{
  model: 'claude-sonnet-4-5',  // NOT Opus — transformation task
  max_tokens: 4096,
  temperature: 0.2,            // low — factual, structured output
}
```

### Loop Condition
If Agent 4 returns `gaps.length > 0` and `severity === 'critical'`:
→ Re-run Agent 3 for flagged frames only (not full regeneration)
→ Max 2 retry loops before surfacing to user

---

## AGENT 4 — REVIEW + GAP CHECK

### Purpose
Validate PRD output against MRD goals. Flag missing coverage, untestable
criteria, and structural gaps. Decide whether to loop or approve.

### Input Contract
```typescript
interface PRDReviewInput {
  prd_output: PRDWritingOutput;   // from Agent 3
  intake: MRDIntakeOutput;        // from Agent 1
  mrd_goals: Goal[];              // extracted goals for coverage check
}
```

### System Prompt
```
You are a PRD reviewer. Validate the provided PRD against the source MRD goals.

Check for:
  1. Coverage: every MRD goal has at least one corresponding PRD requirement
  2. Testability: every acceptance criterion is binary (pass/fail)
  3. Completeness: no required sections are empty or placeholder
  4. Consistency: specs do not contradict each other
  5. Units: all physical measurements include units

Return a structured validation report. Be specific — cite IDs, not vague.
```

### Output Contract
```typescript
interface PRDReviewOutput {
  approved: boolean;
  gaps: Array<{
    type: 'coverage' | 'testability' | 'completeness' | 'consistency' | 'units';
    severity: 'critical' | 'warning' | 'info';
    description: string;
    affected_frame: FrameType;
    affected_field?: string;
  }>;
  coverage_score: number;      // 0–1, MRD goal coverage
  quality_score: number;       // 0–1, PRD quality composite
  loop_required: boolean;      // true if critical gaps exist
}
```

### Approval Gate
- `coverage_score >= 0.85` AND `quality_score >= 0.80` AND no critical gaps → approved
- Otherwise → loop to Agent 3 (max 2x) or surface to user

---

## DEVLOG SPAWN

### Trigger
Fires automatically on PRD approval. Creates the DevLog artifact using
the PRD's `feature_checklist` as the baseline tracking structure.

### Logic
```typescript
async function spawnDevLog(prd: PRDWritingOutput, mrd_id: string): Promise<DevLog> {
  return {
    devlog_id: uuid(),
    prd_id: prd.prd_id,
    mrd_id,
    product_name: prd.frames.find(f => f.frame_type === 'header')?.data.product_name,
    stages: DEFAULT_HARDWARE_STAGES,   // Concept → Proto1 → DFM → Pilot → Production
    feature_baseline: prd.feature_checklist,
    statuses: {},      // empty — filled as engineering progresses
    decision_log: [],  // append-only
    created_at: new Date(),
  };
}
```

### Persistence
```sql
INSERT INTO devlog_documents (id, prd_id, mrd_id, product_name, stages_json,
  feature_baseline_json, statuses_json, decision_log_json, created_at)
VALUES (...)
```

---

## PIPELINE ORCHESTRATION

### n8n Workflow Trigger
```
Trigger: Monday.com webhook → item status = "MRD Approved"
  → Extract mrd_id from Monday item
  → POST /api/pipeline/start { mrd_id }
  → Pipeline runs agents 1→2→3→4
  → On approval: spawn DevLog, update Monday item status = "PRD Ready"
  → On failure: update Monday item status = "PRD Review Needed", attach gap report
```

### API Endpoint
```typescript
// POST /api/pipeline/start
// Orchestrates the full agent chain
export async function POST(req: Request) {
  const { mrd_id } = await req.json();
  const intake = await runAgent1(mrd_id);
  const skeleton = await runAgent2(intake);
  const draft = await runAgent3(skeleton, intake);
  const review = await runAgent4(draft, intake);
  if (review.loop_required) { /* retry logic */ }
  if (review.approved) {
    await savePRD(draft);
    await spawnDevLog(draft, mrd_id);
    await updateMonday(mrd_id, 'PRD Ready');
  }
  return Response.json({ prd_id: draft.prd_id, review });
}
```

---

<!-- @MENTOR:TODO Wire the n8n Monday webhook trigger once PRD pipeline is tested end-to-end -->
<!-- @MENTOR:DECISION See architecture/agent-chain.md for agent base class extension pattern -->
