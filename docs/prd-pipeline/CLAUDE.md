# CLAUDE.md — MRD→PRD Pipeline
# Meta-Orchestrator · Route Map · v1.0

> **This file is the entry point for every agent and every human on this project.**
> Read it fully before loading anything else. It tells you exactly what to read next.

---

## 1. WHAT THIS PROJECT IS

A dedicated pipeline branch that extends `mrd-producer-webapp` to:

1. Transform a completed MRD into a structured PRD (HTML + JSON output)
2. Spawn a linked DevLog artifact that tracks engineering resolution through production stages
3. Compose all three document types (MRD, PRD, DevLog) into a unified HTML frame system

This is **not a standalone app**. It lives in the same repo as `mrd-producer-webapp`,
shares its infrastructure (Neon, Vercel AI SDK, provider abstraction, Drizzle ORM),
and extends its agent patterns.

---

## 2. PROJECT DEPENDENCY MAP

```
mrd-producer-webapp (existing)
  ├── Provider abstraction layer     ← reuse as-is
  ├── Agent base classes             ← extend, do not fork
  ├── Neon PostgreSQL + Drizzle      ← extend schema, do not migrate
  ├── HTML preview + export pipeline ← reuse renderer, add PRD/DevLog templates
  └── Vercel AI SDK                  ← reuse as-is

mrd-prd-pipeline (this branch)
  ├── PRD agent chain                ← NEW
  ├── DevLog artifact system         ← NEW
  ├── Frame composer UI              ← NEW
  └── Extended schema                ← EXTENDS existing
```

---

## 3. ROLE ROUTING TABLE

<!-- @MENTOR:GUARD This table is the canonical routing map. Every role reads ONLY
     what is listed here at session start. No role loads files outside their lane
     without explicit instruction. -->

| Role | First File | Then Load | Do NOT Load |
|------|-----------|-----------|-------------|
| **Claude Code (orchestrator)** | This file | `methodology/pipeline-logic.md` → `architecture/agent-chain.md` → `architecture/data-model.md` | Role files (those are for humans/specialists) |
| **Claude Code (build agent)** | This file | Role file matching the current task | Only load methodology on explicit reference |
| **System Engineer** | This file | `roles/system-engineer.md` → `methodology/pipeline-logic-human.md` → `architecture/integration-points.md` | `roles/code-monkey.md`, `roles/frontend.md` |
| **Backend Developer** | This file | `roles/backend.md` → `architecture/agent-chain.md` → `architecture/data-model.md` | `roles/frontend.md`, `roles/ui-ux.md` |
| **Frontend Developer** | This file | `roles/frontend.md` → `architecture/data-model.md` → `methodology/frame-schema.md` | `roles/backend.md`, `roles/system-engineer.md` |
| **UI/UX Designer** | This file | `roles/ui-ux.md` → `methodology/frame-schema.md` | Architecture files, role files |
| **Code Monkey** | This file | `roles/code-monkey.md` only | Everything else — tasks are self-contained |

---

## 4. SESSION PROTOCOL (AGENTS)

Every Claude Code session on this project:

```
STEP 1: Read CLAUDE.md (this file) — always
STEP 2: Identify current task type:
        ├── Pipeline logic / agent work  → load methodology/pipeline-logic.md
        ├── Data / schema work           → load architecture/data-model.md
        ├── Agent chain work             → load architecture/agent-chain.md
        ├── Frontend / frame work        → load roles/frontend.md + methodology/frame-schema.md
        └── Integration work             → load architecture/integration-points.md
STEP 3: Load only what the task requires. Gate every file read.
STEP 4: Before closing: update the relevant role or architecture file if anything changed.
```

**Never pre-load.** Gate every file. See `mrd-producer-webapp/CLAUDE.md §8.3` for the full gate protocol.

---

## 5. METHODOLOGY QUICK-REF

The MRD→PRD pipeline runs as a **staged agent chain**, not a single prompt:

```
[INPUT]
  MRD JSON (from mrd-producer-webapp DB)
        │
        ▼
[AGENT 1 — MRD Intake]
  Reads MRD. Extracts: product type, goals, market context,
  constraints, user requirements. Outputs structured intake JSON.
        │
        ▼
[AGENT 2 — PRD Structuring]
  Maps intake JSON to PRD frame schema.
  Determines which sections require generation vs. direct extraction.
  Outputs: PRD skeleton with field-level instructions per section.
        │
        ▼
[AGENT 3 — PRD Writing]
  Fills each PRD section. Uses MRD content as grounding.
  Generates: requirements, acceptance criteria, constraints, checklist.
  Model: claude-sonnet-4-5 (Sonnet for transformation tasks — not Opus)
        │
        ▼
[AGENT 4 — Review + Gap Check]
  Validates PRD against MRD goals. Flags missing coverage.
  Returns: validation report + gap list. If gaps > threshold → loop to Agent 3.
        │
        ▼
[OUTPUT]
  PRD HTML frame bundle + PRD JSON record (stored in Neon)
  DevLog artifact spawned with PRD feature checklist as baseline
```

Full agent definitions → `architecture/agent-chain.md`
Full data contracts → `architecture/data-model.md`
Human-readable rationale → `methodology/pipeline-logic-human.md`

---

## 6. FRAME SYSTEM OVERVIEW

Every document type in this system is a collection of **HTML frames**:

| Frame Type | Document Types | Agent Owner |
|-----------|---------------|-------------|
| `header` | MRD, PRD, DevLog | All |
| `overview` | MRD, PRD | PRD Writing Agent |
| `goals` | MRD, PRD | PRD Structuring Agent |
| `scope` | PRD | PRD Writing Agent |
| `environments` | PRD | PRD Writing Agent |
| `requirements` | PRD | PRD Writing Agent |
| `acceptance` | PRD | PRD Writing Agent |
| `assumptions` | PRD | PRD Writing Agent |
| `checklist` | PRD, DevLog | PRD Writing Agent → DevLog |
| `stage-resolution` | DevLog | DevLog System |
| `decision-log` | DevLog | DevLog System |

Frame schema + HTML contracts → `methodology/frame-schema.md`

---

## 7. CRITICAL CONSTRAINTS

<!-- @MENTOR:GUARD Never violate these. They are architectural decisions, not preferences. -->

1. **No new infrastructure.** Reuse mrd-producer-webapp's DB, provider layer, and export pipeline.
2. **Sonnet, not Opus.** PRD transformation is a structuring task. Opus is not justified.
3. **PRD cannot exist without an MRD.** The pipeline is unidirectional. No standalone PRD creation.
4. **DevLog cannot exist without a PRD.** It inherits the feature checklist as its baseline. No orphan DevLogs.
5. **HTML is the source of truth.** DOCX and PDF are exports from HTML. Never maintain two formats.
6. **Append-only decision log.** DevLog entries are never deleted or edited. Status changes are new entries.
7. **Frames are composable.** The composer assembles frames. Agents produce frames. Neither does both.

---

## 8. OPEN ITEMS

<!-- @MENTOR:TODO Track these — they are real blockers -->

- [ ] PRD template formal schema not yet written → `methodology/frame-schema.md` is the output
- [ ] mrd-producer-webapp test suite: 148 failing tests — audit shared infra tests before building on top
- [ ] DevLog persistence: localStorage in prototype → migrate to Neon `devlog_entries` table
- [ ] Composer UI: not yet designed → `roles/ui-ux.md` owns this
- [ ] MRD output format: confirm current JSON structure before writing Agent 1 intake logic

---

## 9. FILE TIER MAP

| File | Tier | Load Rule |
|------|------|-----------|
| CLAUDE.md | T1 | Always |
| methodology/pipeline-logic.md | T1 (agent sessions) | Always for agent work |
| architecture/agent-chain.md | T2 | When working on agents |
| architecture/data-model.md | T2 | When working on schema |
| architecture/integration-points.md | T2 | When working on wiring |
| methodology/frame-schema.md | T2 | When working on frames |
| roles/*.md | T2 | Role-specific, load by match |
| methodology/pipeline-logic-human.md | T3 | Human reference only |
| methodology/devlog-spec.md | T2 | When working on DevLog |

---

*v1.0 · MRD→PRD Pipeline Branch · Compulocks AI Platform · Initiative 1*
