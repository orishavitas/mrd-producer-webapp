# Data Model — Architecture Reference
# Schema · Relationships · Data Flow

## Document Hierarchy

```
mrd_documents (existing)
  │
  └─── prd_documents (1:1 per MRD, can be regenerated)
         │
         ├─── prd_frames (1:many, one per frame type)
         │
         └─── devlog_documents (1:1 per PRD)
                │
                └─── devlog_entries (1:many, append-only)

pipeline_runs (1:many per MRD — tracks each generation attempt)
```

## Key Relationships

- One MRD → one active PRD (previous versions become status: 'superseded')
- One PRD → one DevLog (spawned on PRD approval, cannot exist without PRD)
- DevLog entries are append-only — no update or delete operations, ever
- PRD frames are regeneratable — stored data JSON is the source of truth for re-render

## State Machine

### PRD Status
`draft` → `in_review` → `approved` → `superseded`

### Pipeline Run Status
`running` → `approved` | `requires_review` | `failed`

### DevLog Stage Status (per feature, per stage)
`pending` → `achieved` | `exceeded` | `partial` | `deferred` | `dropped`
(State changes are new entries, not updates to existing records)
