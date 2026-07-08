# GCS Document Storage + Google Drive Save/Export Routing — Design Spec

**Version:** 1.0.0
**Date:** 2026-07-08
**Author:** Ori Shavit
**Status:** Approved — ready for implementation planning

---

## Overview

This spec replaces Postgres-backed document storage (`documents`, `pipeline_runs`, `prd_documents`, `prd_frames` tables) with Google Cloud Storage (GCS) as the canonical store for One-Pager and PRD documents, and adds Google Drive as the destination for human-readable exports and a JSON clone, organized into per-project folders under two existing master folders.

This is the foundation spec. [PRD Producer Rebuild](2026-07-08-prd-producer-rebuild-design.md) depends on the storage and Drive-routing APIs defined here.

**Explicitly out of scope:** MRD (`/mrd`, `/mrd-generator`) — not released, not touched. The feature allowlist stays in Postgres (already migrated, working, low-risk) — this spec does not touch it, except to add one new flag (`commentor`) in the PRD spec.

---

## Background / Prior Decisions

A prior session (2026-07-08, earlier) designed GCS as the target for document storage, explicitly choosing it over Google Drive for canonical storage due to lower overhead and IAM-based access control. This spec keeps that decision: **GCS holds canonical JSON, Drive is a save/export destination only** — the two are complementary, not competing.

---

## Storage Layer (GCS — canonical)

One bucket, three prefixes:

```
gs://<bucket>/one-pager/{id}.json
gs://<bucket>/prd/{id}.json
gs://<bucket>/prd-runs/{runId}.json      ← ephemeral PRD generation state (see PRD spec)
```

Each `one-pager/` and `prd/` prefix also has a `_index.json` mapping `id → {productName, driveFolderId}` so lookups don't require listing the bucket.

### Document envelope (shared shape)

```json
{
  "id": "uuid",
  "toolType": "one-pager" | "prd",
  "productName": "...",
  "userId": "...",
  "creatorName": "...",
  "status": "draft" | "published",
  "version": "0.3",
  "contentJson": { ... },
  "versionHistory": [ { "version", "savedAt", "contentJson" } ],
  "driveFolderId": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

`driveFolderId` is a cache of the resolved Drive project folder (see below) — avoids a folder search on every save once resolved.

### Concurrency

Single sequential writer per document (one user edits their own doc at a time). Plain read-modify-write with a GCS generation-match precondition (`ifGenerationMatch`). A genuine collision fails loudly (409), not silently.

### Filename / versioning semantics

One file per document (not per version), overwritten on every save. `version` and `versionHistory` inside the JSON track history — max 20 snapshots, oldest spliced out (same limit as today's Postgres behavior).

---

## Google Drive Save/Export Routing

### Master folders (already exist, provided by user)

| Tool type | Master folder |
|---|---|
| One-Pager / MRD | `1iQvjoIRgRmP8tiUY1pPhT6ecrx_jNftl` ("MRD producer") |
| PRD | `1vUjZ1yaJCQ_azpAUs56pfAlCgTMqsaNw` ("PRD producer") |

### Auth model

App-owned service account (same pattern as Secret Manager access today) with edit access granted on both master folders. No per-user OAuth — these are app-managed folders, not individual users' Drives. This is a deliberate change from the earlier `drive.file` per-user-OAuth stub design, since the requirement is now "one shared team folder tree," not "sync to each user's personal Drive."

### Project folder resolution

On every save/publish, resolve the destination folder in this order:

1. If the document envelope has a cached `driveFolderId`, verify it still exists (cheap `get` call). If valid, use it.
2. Otherwise, search the master folder's immediate children for a subfolder matching `productName` (case-insensitive exact match).
3. If found, cache its ID onto the envelope and use it.
4. If not found, create a new subfolder named `productName` under the master folder, cache its ID, use it.

This means folder identity is keyed by product name but cached by ID — resilient to the folder being renamed later (cache still resolves by ID) and to the cache being stale or missing (falls back to name search).

### What gets written per save

| File | Naming | Overwrite behavior |
|---|---|---|
| Export (DOCX) | `{product} - {type} - v{version} - {date}.docx` | Never overwritten — new file every save |
| Export (HTML) | `{product} - {type} - v{version} - {date}.html` | Never overwritten — new file every save |
| Export (PDF) | `{product} - {type} - v{version} - {date}.pdf` | Never overwritten — new file every save |
| JSON clone | `{product}.json` | Always overwritten — single current-state file |
| Changelog | `{product} - Changelog.md` | Appended — one line per save, never replaced |

`{type}` is `One-Pager` or `PRD`. `{date}` is `YYYY-MM-DD`. Exports are only written on an explicit **Save/Publish** action (not on every keystroke/autosave) — matches today's behavior where autosave is client-side state and persistence happens on save/publish actions.

### Changelog format

Markdown, appended (not overwritten), one entry per save:

```markdown
## v0.3 — 2026-07-08 14:32 UTC — ori@compulocks.com
- Status: draft
- Summary: <first ~120 chars of what changed, or "Initial save" for the first entry>
```

The "what changed" summary is a simple diff of top-level `contentJson` keys that changed since the previous version (e.g. "features, competitors updated") — not a full prose changelog. Good enough for a human skimming save history; not intended to replace `versionHistory` for programmatic rollback (that stays in the GCS JSON, unchanged from today's Postgres-based rollback feature).

### Shared implementation

One module, `lib/drive/drive-sync.ts`, exposes:

```ts
saveDocumentToDrive(envelope: DocumentEnvelope, exports: {docx?: Buffer, html?: string, pdf?: Buffer}): Promise<{driveFolderId: string}>
```

Used by both the One-Pager save/publish path and the PRD save/publish path — no per-tool duplication. Internally handles folder resolution, versioned export upload, JSON clone overwrite, and changelog append as one sequenced operation (folder resolve → uploads in parallel → changelog append last, since it should reflect a save that actually succeeded).

### Failure handling

Drive writes happen **after** the GCS write succeeds and are best-effort: if Drive is unreachable or a call fails — including failure during folder resolution itself (step 1-4 above) — the save is still considered successful (GCS is canonical), but the user sees a non-blocking warning ("Saved, but Drive export failed — retry from the document menu"). On folder-resolution failure specifically, the `driveFolderId` cache is left untouched (not cleared, not set to a bad value) so the next retry re-attempts resolution from scratch. A manual "Retry Drive export" action re-runs `saveDocumentToDrive` for the current state without re-running generation.

---

## Migration from Postgres

- `documents` table rows (One-Pager, excluding MRD/brief tool_types) are one-time migrated to `gs://<bucket>/one-pager/{id}.json` by a script, preserving `id`, `version`, `version_history`.
- `pipeline_runs`, `prd_documents`, `prd_frames` are **not** migrated — the existing PRD data is from the broken pipeline and has never been successfully reviewed end-to-end (confirmed with user). These tables are dropped after the new PRD system (see companion spec) ships.
- After migration, `lib/db.ts` document CRUD functions are replaced by `lib/gcs/documents.ts` equivalents with the same call signatures where practical, to minimize churn in calling code.
- Postgres `documents`-related migrations (001, 003) are left in place historically; a new migration (005) drops `pipeline_runs`/`prd_documents`/`prd_frames` once the PRD rebuild ships. `documents` table itself is dropped once One-Pager fully cuts over and the migration script has run in production.

---

## Testing

- Unit tests for `lib/gcs/documents.ts` (envelope read/write, generation-match conflict handling) against a fake/mocked GCS client.
- Unit tests for `lib/drive/drive-sync.ts` folder resolution logic (cached ID valid / cached ID stale / no cache found / no cache not found) against a mocked Drive client.
- Integration test (manual, documented in runbook): one real save from the One-Pager UI, verify GCS object + Drive folder + files land correctly in a test master folder before pointing at the real production master folders.

---

## Open Items Deferred (not blocking this spec)

- Real Google OAuth for end-user sign-in (separate from the Drive service account) — tracked in `gcp-migration/06-2026-07-08-session-log.md`, unrelated to this spec.
- CI/CD for GCP — unrelated to this spec.
