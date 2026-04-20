# MRD→PRD Pipeline
## Compulocks AI Platform · Initiative 1 · Document Generation Branch

This branch extends `mrd-producer-webapp` to automate the MRD→PRD transformation
and spawn a living DevLog artifact for engineering tracking.

---

## What This Builds

1. **PRD Producer** — 4-agent chain that transforms a completed MRD into a structured PRD (HTML + JSON)
2. **DevLog System** — living engineering resolution log, codependent on PRD, tracks feature status through hardware development stages
3. **Frame Composer** — UI for assembling MRD, PRD, and DevLog frames into audience-specific documents

---

## Quick Start for Agents (Claude Code)

Read `CLAUDE.md`. It tells you everything.

## Quick Start for Humans

| Your Role | Read First |
|-----------|-----------|
| Team Lead / Overview | This file → `CLAUDE.md` |
| System Engineer | `roles/system-engineer.md` |
| Backend Developer | `roles/backend.md` |
| Frontend Developer | `roles/frontend.md` |
| UI/UX Designer | `roles/ui-ux.md` |
| Implementation Tasks | `roles/code-monkey.md` |

---

## Prerequisites

- `mrd-producer-webapp` codebase (this branches from it)
- Neon PostgreSQL instance (same as mrd-producer-webapp)
- Vercel project (same as mrd-producer-webapp)
- Monday.com API token (existing)
- Anthropic API key (existing)

---

## Architecture in One Paragraph

The pipeline runs when an MRD is approved in Monday.com. A 4-agent chain
(intake → structure → write → review) transforms the MRD JSON into a PRD
with HTML frames and a feature checklist. On approval, a DevLog is spawned
with the PRD checklist as its baseline. All three document types (MRD, PRD,
DevLog) share a frame system that the Composer UI assembles into
audience-specific exports (HTML, PDF, DOCX).

---

## Status

- [x] Frame templates designed (PRD + DevLog HTML prototypes)
- [ ] Database schema (system engineer — see `roles/system-engineer.md`)
- [ ] Agent implementation (backend — see `roles/backend.md`)
- [ ] Frame components (frontend — see `roles/frontend.md`)
- [ ] Composer UI (UI/UX → frontend)
- [ ] n8n Monday webhook trigger

---

*Compulocks AI Platform · Initiative 1 · April 2026*
