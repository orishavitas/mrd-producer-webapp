# PRD Producer Rebuild — Design Spec

**Version:** 2.0.0 (supersedes `2026-04-21-prd-producer-design.md`)
**Date:** 2026-07-08
**Author:** Ori Shavit
**Status:** Approved — ready for implementation planning

---

## Overview

The existing PRD Producer (4-agent pipeline, skeleton approval gate, Postgres storage) is confirmed broken — it was never successfully reviewed end-to-end by the user. This spec replaces it entirely with a simpler, fixed-template generator built on top of [GCS Document Storage + Drive Routing](2026-07-08-gcs-drive-storage-design.md), plus a persistent per-section comment/review system.

Pipeline: **One-Pager JSON → PRD generation (one shot) → human review/edit/comment → export (DOCX/HTML/PDF)**. The One-Pager remains the sole input source (MRD stays out of scope, unchanged from the original spec).

This is a full rebuild, not an incremental patch: the old `pipeline_runs`/`prd_documents`/`prd_frames` Postgres tables, the analyst/architect/writer/QA agent chain, the start/resume API split, and the skeleton approval gate are all removed.

---

## Content Model

Fixed section template, modeled directly on the user's reference PRD format, defined in `config/prd-sections.yaml`:

1. **Overview** — free text
2. **Goals** — numbered list
3. **Design Scope** — In scope / Out of scope, two lists
4. **Target Environments & Use Cases** — free text + lists (from One-Pager environments/industries)
5. **Requirements** — structured table: `ID` (FR-1, FR-2, ...), `Category`, `Requirement`, `Priority` (Must / Nice to have)
6. **Engineering Acceptance Criteria** — numbered list
7. **Assumptions & Dependencies** — numbered list
8. **Commercial Parameters** — MOQ, target price, number of samples (from One-Pager commercials)
9. **Open Questions** — numbered list
10. **Success Criteria** — numbered list
11. **References** — auto-populated: source One-Pager name, prepared-by

Each section has an `enabled: boolean` flag. Default value is derived from the source One-Pager's `skippedSections` map where a direct correspondence exists (e.g. One-Pager "Commercials" skipped → PRD "Commercial Parameters" defaults off); sections with no One-Pager equivalent (e.g. Engineering Acceptance Criteria) default on. The user can override any section's enabled state in the review UI, independent of the One-Pager's state — this override is stored on the PRD document, not written back to the One-Pager.

Disabled sections are omitted from all exports (DOCX/HTML/PDF) and hidden (not just grayed out) in the review UI's main view, but remain togglable back on at any time before final export.

### Types

```ts
interface PRDSection {
  key: string;               // 'overview', 'requirements', etc.
  title: string;
  enabled: boolean;
  content: string | RequirementRow[];  // string for prose sections, rows for 'requirements'
}

interface RequirementRow {
  id: string;        // "FR-1"
  category: string;
  requirement: string;
  priority: 'Must' | 'Nice to have';
}

interface PRDComment {
  id: string;
  sectionKey: string;
  author: string;        // email
  body: string;
  createdAt: string;
  resolved: boolean;
}

interface PRDDocument {
  id: string;
  sourceOnePagerId: string;
  productName: string;
  preparedBy: string;
  version: string;
  status: 'draft' | 'published';
  sections: PRDSection[];
  comments: PRDComment[];
  versionHistory: [...];   // same shape as One-Pager, per GCS storage spec
  createdAt: string;
  updatedAt: string;
}
```

This is the `contentJson` stored inside the shared GCS envelope from the storage spec (`toolType: "prd"`).

---

## Generation

Single synchronous API call — no streaming, no NDJSON, no approval gate before writing:

```
POST /api/prd/generate
Body: { onePagerId: string }
Response: PRDDocument (full, all enabled sections populated)
```

One agent (`agent/agents/prd/PRDGeneratorAgent.ts`) reads the One-Pager's `contentJson` from GCS and writes all enabled sections in a single pass (sections are independent enough to generate in parallel internally via `Promise.all`, same technique the old Agent 3 used, but as one internal implementation detail, not a pipeline phase). The Requirements table is derived from the One-Pager's `mustHave`/`niceToHave` feature lists plus environments/industries — each feature becomes a candidate requirement row with Priority mapped from must/nice-to-have.

Old concepts explicitly dropped:
- **Skeleton + approval gate** — no longer meaningful once sections are fixed rather than agent-invented.
- **QA scoring agent** (`qa_score`, `qa_suggestions`) — review is now human-driven via comments, not agent-scored.
- **start/resume split** — generation is fast enough (fixed sections, no multi-round skeleton negotiation) to run as one request within Cloud Run's request timeout.

On completion, the PRD is saved to GCS (`prd/{id}.json`) via the shared storage layer, `status: 'draft'`.

---

## Review / Edit UI

Route: `/prd/[id]`. Replaces the old `/prd/pipeline` flow entirely.

- Each section renders as a card: title, enabled/disabled toggle, content, and a comment thread panel.
- **Requirements section**: structured table editor — add row, remove row, reorder (drag or up/down), edit each cell (ID auto-increments as `FR-N`, using the next unused number, but is editable). IDs are stable per row and never renumbered on delete or reorder — deleting FR-2 leaves FR-1 and FR-3 as-is rather than shifting everything down, so gaps in the sequence are expected and not a bug. Priority is a dropdown (`Must` / `Nice to have`).
- **All other sections**: plain textarea, markdown-lite (bold, bullet lists) consistent with today's `prd-document-generator.ts` rendering.
- Comment panel per section: list of existing comments (author, timestamp, body, resolved checkbox), plus an add-comment box. Comments persist immediately (own save action, not bundled with document save) via the comments API below.
- Save button persists `sections[]` + toggle states through the shared storage/Drive path (Spec 1) — this is a normal document save, versioned like One-Pager saves.
- Publish button behaves like One-Pager publish: bumps to next major version, triggers Drive export (DOCX/HTML/PDF + JSON clone + changelog entry).

---

## Comments System

### Storage

`comments: PRDComment[]` lives inside the PRD's own GCS envelope (`contentJson.comments`) — no separate database table. Anchored per-section via `sectionKey`. This keeps comments versioned alongside the document for free (they ride along in `versionHistory` snapshots) and keeps the data model to one artifact per document.

### API

```
GET  /api/prd/[id]/comments          → PRDComment[]
POST /api/prd/[id]/comments          → { sectionKey, body } → creates comment, returns updated list
PATCH /api/prd/[id]/comments/[commentId]   → { resolved: boolean }
```

These read/modify/write the PRD envelope directly (same generation-match concurrency handling as any other document save). `PATCH` (resolve/unresolve) is restricted to the comment's own author or the PRD document's owner — any other allowlisted commentor can read and add comments but not resolve someone else's.

### Access control — new `commentor` allowlist flag

A fifth global allowlist feature flag, `commentor`, added alongside `mrd-generator` / `one-pager` / `brief-helper` / `one-pager-beta` / `prd-producer` / `one-pager-alpha` / `rd-viewer`. Anyone holding `commentor` (or already having PRD access via `prd-producer`/`rd-viewer`) can view and comment on any PRD they have the link/ID for — this is a flat capability, not a per-document ACL (consistent with how the rest of the allowlist works today; per-document sharing is out of scope).

Migration `006-commentor-role.sql` adds no new table — it's just a new valid value in the existing `allowlist` table's feature column, so this is a data change, not a schema change.

### HTML export as a live thin-client

The exported HTML file (`{product} - PRD - v{version} - {date}.html`, written to Drive per Spec 1) is not a static snapshot for comments — it embeds:
- The rendered PRD content (static, same as today's HTML export rendering).
- The PRD's `id`.
- A comment panel (small embedded JS) that calls the production API directly: `GET/POST https://<cloud-run-service-url>/api/prd/{id}/comments`.
- On first comment attempt, if the visitor isn't authenticated, they're redirected through the app's existing Google sign-in, then back to the exported file's comment panel (via a return-URL parameter) — the exported HTML doesn't reimplement auth, it reuses the app's existing session/OAuth flow.
- The visitor must satisfy the `commentor` (or `prd-producer`/`rd-viewer`) allowlist check server-side, same as any in-app request — the exported file grants no elevated or anonymous access.

DOCX and PDF exports remain fully static — no embedded comment capability. Only HTML is a live thin-client. This means the HTML export has a hard dependency on the Cloud Run API being reachable from wherever the file is opened; if the API is down, the panel shows a "comments unavailable" state but the document content itself remains fully readable (content is inlined in the HTML, not fetched).

### Future extension point (not built in this pass)

The comment schema (`sectionKey` + `body`, generic across document types) is intentionally not PRD-specific in shape, so a later pass can extend commenting to One-Pagers or feed resolved comments into other document types (e.g. a future "brief helper" reading prior PRD feedback). No cross-document wiring is implemented now — this is a design note for future work, not a requirement of this spec.

---

## API Summary

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/prd/generate` | Generate a full PRD from a One-Pager id (one shot) |
| `GET` | `/api/prd/[id]` | Fetch PRD document |
| `PATCH` | `/api/prd/[id]` | Save edits (sections, toggles) — versioned |
| `POST` | `/api/prd/[id]/publish` | Publish — version bump + Drive export |
| `GET` | `/api/prd/[id]/comments` | List comments |
| `POST` | `/api/prd/[id]/comments` | Add comment |
| `PATCH` | `/api/prd/[id]/comments/[commentId]` | Resolve/unresolve comment |
| `GET` | `/api/prd/[id]/export` | On-demand DOCX/HTML/PDF (same formats as today) |

All routes replace the entire `/api/pipeline/prd/*` tree, which is deleted.

---

## Removed Surface Area

- `app/api/pipeline/prd/**` (start, resume, approve, export, status)
- `app/prd/pipeline/page.tsx` (skeleton review UI)
- `agent/agents/prd/OnePagerAnalystAgent.ts`, `PRDArchitectAgent.ts`, `PRDWriterAgent.ts`, `PRDQAAgent.ts` — replaced by single `PRDGeneratorAgent.ts`
- `lib/prd-db.ts` — replaced by GCS-backed `lib/gcs/prd-documents.ts`
- Postgres tables `pipeline_runs`, `prd_documents`, `prd_frames` (dropped via migration `007-drop-prd-tables.sql`, after this ships and the old data is confirmed unneeded — already agreed with user, since no PRD was ever successfully completed with the old system)

## Retained / Reused

- `lib/prd-document-generator.ts` (DOCX/HTML rendering) — adapted to render from `PRDSection[]` instead of `PRDFrame[]`, and to inject the comment-panel script tag for HTML output only.
- `config/prd-sections.yaml` — new file, replaces the dynamic skeleton concept but keeps the "config-driven sections" pattern already used elsewhere (e.g. `standard-features.yaml`).
- Allowlist infrastructure (`lib/feature-gate.ts`) — extended with one new flag, not restructured.

---

## Testing

- Unit tests for `PRDGeneratorAgent` section generation (mocked provider responses), especially Requirements-table derivation from One-Pager features.
- Unit tests for comment API concurrency (two comments added near-simultaneously don't clobber each other — relies on the same generation-match precondition as document saves).
- Unit tests for `commentor` allowlist gating (has flag / has prd-producer / has neither).
- Manual verification: generate a PRD from a real One-Pager, confirm Requirements table content is sensible, edit + comment + publish, open the exported HTML from Drive and confirm the comment panel round-trips against the live API.

---

## Migration Note

No data migration for existing PRD records — confirmed with the user that no PRD has ever been successfully completed end-to-end under the old system, so there is nothing worth preserving. The old Postgres tables are dropped, not migrated.
