# Pipeline Logic — Human Reference
# Architecture Narrative · Decisions · Rationale

> This is the human-readable companion to `pipeline-logic.md`.
> If you're a developer or engineer trying to understand *why* the system is built
> this way, read this first. Then read the agentic file for the contracts.

---

## The Core Idea

The MRD→PRD pipeline is a **transformation pipeline, not a generation pipeline.**

This distinction matters. The MRD already contains the product knowledge — market context,
goals, constraints, competitive landscape. The PRD isn't invented from scratch; it's
the same information restructured for a different audience (R&D and engineering vs.
product and market).

This means the agents are doing mostly **extraction, structuring, and formalization** —
not open-ended creative generation. That's why we use Sonnet, not Opus. And it's why
Agent 2 (Structuring) is arguably the most important agent in the chain — it decides
the source strategy for every field before any writing happens.

---

## Why Four Agents

A single "MRD to PRD" prompt would work for a demo. It doesn't work for a production
system because:

1. **Debugging is impossible.** When output is wrong, you can't tell which step failed.
2. **Quality control has no insertion point.** You can't review or correct mid-process.
3. **Retry logic can't be targeted.** If acceptance criteria are weak, you'd regenerate
   the entire PRD instead of just that section.
4. **The tasks are fundamentally different.** Extraction, structuring, writing, and
   reviewing are distinct cognitive operations. Mixing them in one prompt degrades
   each one.

The four-agent split maps to four separable concerns. Each agent has a narrow,
testable scope. If Agent 3 produces weak requirements, Agent 4 catches it and
loops back — only Agent 3 re-runs, not the whole chain.

---

## The Structuring Agent is the Critical Path

Agent 2 produces the PRD skeleton — a field-by-field map of where every piece of
PRD content comes from. It answers: "For this PRD field, should I extract from MRD,
derive from MRD data, generate fresh, or flag for human input?"

This is the highest-leverage decision in the pipeline. If the skeleton is wrong,
everything downstream is wrong. Agent 2 runs on low temperature (0.1) and its
output is validated against the frame schema before Agent 3 ever starts.

In early versions, a human should review the skeleton before Agent 3 runs. This
is configurable via the `human_review_gate` flag in the pipeline config.

---

## The Frame System

Every document type — MRD, PRD, DevLog — is a collection of named HTML sections
called **frames**. A frame is a self-contained `<section data-frame="type">` block.

The frame system exists for one reason: **composability**. The same product
information gets presented differently to R&D, to marketing, to clients, and to
leadership. Instead of maintaining four separate documents, you maintain one pool
of frames and compose them per-audience.

In practice:
- **R&D gets:** overview + goals + scope + requirements + acceptance + assumptions + checklist
- **Client gets:** header + overview + goals + environments + key features (curated subset)
- **Leadership gets:** header + overview + goals + delta summary (from DevLog)

The composer UI (owned by frontend) handles the assembly. Agents produce frames.
They never compose.

---

## The DevLog Architecture Decision

The DevLog was deliberately designed as a **separate document type** rather than a
PRD section. Here's why:

A PRD is a spec — it captures intent before engineering. It's written once and
updated rarely. A DevLog is a living record — it captures reality as engineering
progresses, stage by stage. These have fundamentally different write patterns,
different audiences, and different lifecycles.

Coupling them would mean the PRD becomes mutable in ways that make version
comparison difficult. Keeping them separate means the PRD remains a stable spec
baseline, and the DevLog tracks the delta from that baseline over time.

The DevLog inherits the PRD's feature checklist as its tracking structure. This
creates a hard dependency: you can't have a DevLog without a PRD. That's intentional.
The DevLog's job is to measure engineering output against spec — you need the spec first.

---

## Why HTML is the Source of Truth

The document pipeline produces HTML, not DOCX or PDF. Here's the reasoning:

1. **DOCX is a dead end for composition.** You can't embed video, you can't compose
   sections from multiple sources, and you can't render in a browser.
2. **PDF is an export format, not a source format.** It's for printing and sending,
   not for editing and composing.
3. **HTML is already what the client handoff needs.** The final client presentation
   is an HTML file. If HTML is the source of truth, the handoff is zero-effort.
4. **DOCX export is trivial from HTML.** The reverse is painful.

The existing mrd-producer-webapp already has HTML preview. This pipeline extends
that pattern. DOCX and PDF are exports from HTML, generated on demand.

---

## On Model Selection

Sonnet for transformation tasks. Opus only if there's a specific, measurable reason.

The PRD pipeline is transformation, not generation. The MRD already contains the
product knowledge. Agent 3 is filling structured fields from known source material —
this is exactly where Sonnet performs at Opus quality for a fraction of the cost.

The only candidate for Opus escalation is if Agent 2 (Structuring) produces
consistently poor skeletons — but this is more likely a prompt engineering problem
than a model capability problem. Fix the prompt before escalating the model.

The provider abstraction layer in mrd-producer-webapp already handles model routing.
Swapping a single agent to Opus is a one-line config change.

---

## The Monday.com Integration

Monday.com is the trigger, not the owner. The pipeline runs when an MRD is marked
approved in Monday. The output (PRD status) is reported back to Monday. But the
actual document lifecycle lives in Neon.

This keeps Monday as the project management layer it already is, and keeps the
AI platform as the document/knowledge layer. They're connected by webhooks,
not by trying to turn Monday into a document store.

---

## Known Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Weak MRD → weak PRD | High | Agent 4 gap check + coverage score threshold |
| Agent 2 skeleton errors | High | Human review gate (configurable) before Agent 3 |
| PRD spec drift over time | Medium | DevLog tracks delta; PRD versions are immutable |
| Test suite debt (148 failing) | Medium | Audit shared infra tests before building |
| Frame schema changes breaking existing docs | Medium | Frame versioning in schema definition |

---

## What's Not Built Yet

- [ ] Human review gate UI (between Agent 2 and Agent 3)
- [ ] Frame composer UI (assembles frames per audience)
- [ ] DevLog Neon persistence (currently localStorage in prototype)
- [ ] n8n Monday webhook trigger (endpoint exists, webhook not configured)
- [ ] Confidence threshold admin controls
