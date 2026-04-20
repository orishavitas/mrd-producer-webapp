# Agent Chain — Architecture Reference
# Agent Definitions · Handoffs · Base Class Extension

<!-- @MENTOR:CONTEXT T2 — load when working on agent implementation.
     This is the structural reference. Prompt contracts are in pipeline-logic.md. -->

## Chain Overview

```
MRD Record (DB)
      │
      ▼
Agent 1: MRDIntakeAgent
  extends: BasePRDAgent extends BaseAgent
  model: claude-sonnet-4-5
  temperature: 0.1
  output: MRDIntakeOutput → pipeline_runs.agent_1_output
      │
      ▼
Agent 2: PRDStructuringAgent
  extends: BasePRDAgent
  model: claude-sonnet-4-5
  temperature: 0.1
  output: PRDSkeletonOutput → pipeline_runs.agent_2_output
      │
  [OPTIONAL HUMAN GATE — env: PIPELINE_HUMAN_REVIEW_GATE]
      │
      ▼
Agent 3: PRDWritingAgent
  extends: BasePRDAgent
  model: claude-sonnet-4-5
  temperature: 0.2
  output: PRDWritingOutput → pipeline_runs.agent_3_output
      │
      ▼
Agent 4: PRDReviewAgent
  extends: BasePRDAgent
  model: claude-sonnet-4-5
  temperature: 0.0
  output: PRDReviewOutput → pipeline_runs.agent_4_output
      │
  ┌───┴────────────────────┐
  │ approved?              │ loop_required? (max 2x)
  ▼                        ▼
Save PRD              Re-run Agent 3
Spawn DevLog          (failed frames only)
Update Monday
```

## Agent Inheritance

```typescript
BaseAgent (existing, mrd-producer-webapp)
  └── BasePRDAgent (new, adds pipeline logging)
        ├── MRDIntakeAgent
        ├── PRDStructuringAgent
        ├── PRDWritingAgent
        └── PRDReviewAgent
```

Never fork BaseAgent. Only extend.

## Approval Thresholds (configurable via env)

| Threshold | Env Var | Default |
|-----------|---------|---------|
| Coverage score | `PRD_COVERAGE_THRESHOLD` | 0.85 |
| Quality score | `PRD_QUALITY_THRESHOLD` | 0.80 |
| Max retry loops | `PRD_MAX_RETRIES` | 2 |
| Gap halt threshold | `PRD_MAX_GAPS` | 5 |
