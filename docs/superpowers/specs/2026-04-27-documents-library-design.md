# Documents Library — Design Spec

**Version:** 1.0.0
**Date:** 2026-04-27
**Author:** Ori Shavit
**Status:** Approved — ready for implementation planning

---

## Overview

Upgrade the existing "Recent Documents" dashboard section into a unified Documents Library. Users can browse all their saved documents across tools, download as DOCX or HTML (opens in new tab), and delete. No new route — lives on the dashboard (`/`).

---

## Scope

Tools surfaced in the library:
- **One-Pager** — documents from `documents` table where `tool_type = 'one-pager'`
- **PRD** — documents from `prd_documents` table (feature-gated: only shown to users with `prd-producer` feature in allowlist)

Tools NOT surfaced (out of scope this phase):
- **One-Pager Beta** — logs to Google Sheets only, no DB records to list
- **MRD Generator** — no structured export yet
- **Brief Helper** — no export yet

---

## UI Design

### Tab Bar
Three tabs above the table: **All** | **One-Pager** | **PRD**

- Active tab: white text, 2px `--brand-green-dark` bottom border
- Inactive tabs: muted text, no border
- PRD tab hidden for users without `prd-producer` feature in allowlist
- Tab selection is client-side state — no network request on switch

### Table Columns
`Title` | `Type` | `Creator` | `Date` | `Actions`

- **Title**: plain text (no click navigation — download is the action)
- **Type**: color-coded badge — One-Pager (`--brand-highlight` bg), PRD (green-tinted)
- **Creator**: `creator_name` or `creator_email`, "you" pill if matches current user
- **Date**: `updated_at` formatted as "Apr 23"
- **Actions**: `DOCX` button + `HTML` button + `✕` delete — all right-aligned

### Download Behavior
- **DOCX**: opens `/api/one-pager/export?id=<id>&format=docx` or `/api/pipeline/prd/<id>/export?format=docx` in new tab → browser triggers file download
- **HTML**: opens same endpoints with `format=html` in new tab → renders in browser
- Both open via `window.open(url, '_blank')` — no modal

### Delete Behavior
- `✕` button calls existing `DELETE /api/documents/<id>` for One-Pager/Beta rows
- PRD delete: new `DELETE /api/pipeline/prd/<prd_id>` endpoint (soft-delete on `prd_documents`)
- Optimistic UI — row removed immediately, re-added on failure

---

## Data Layer

### Unified Document Type
```typescript
interface LibraryDocument {
  id: string;
  title: string;
  toolType: 'one-pager' | 'prd';
  creatorName: string | null;
  creatorEmail: string | null;
  updatedAt: string;
  exportBaseUrl: string; // pre-built URL prefix for download buttons
}
```

### Data Fetching
Server component (`app/page.tsx`) fetches both sources in parallel:
```typescript
const [opDocs, prdDocs] = await Promise.all([
  listDocumentsWithCreator(email, ['one-pager']),
  isRDUser ? listPRDDocuments(email) : Promise.resolve([]),
]);
```

New DB function needed: `listPRDDocuments(createdBy: string): Promise<PRDDocumentSummary[]>` in `lib/prd-db.ts`

Results merged and sorted by `updated_at DESC` before passing to client.

---

## Components

### Modified: `DashboardShell.tsx`
- Accept `LibraryDocument[]` instead of `DocumentWithCreator[]`
- Pass through to upgraded `DocumentsTable`

### Modified: `DocumentsTable.tsx`
- Add tab bar (client state: `activeTab`)
- Filter rows by `toolType` when tab !== 'all'
- Add DOCX / HTML buttons per row
- Hide PRD tab when no PRD docs in list
- Keep existing delete logic, extend for PRD rows

### No new routes or API endpoints required except:
- `DELETE /api/pipeline/prd/[prd_id]` — soft-delete PRD document

---

## Error Handling

- DB fetch failure → show empty state, no crash
- Download URL 404 → browser shows error in new tab (acceptable)
- Delete failure → restore row, show inline error text

---

## Out of Scope

- Search / sort within the table
- Pagination (show all, up to reasonable limit ~50)
- MRD / Brief Helper documents
- Inline rename of document title
- PRD re-run from library row (use `/prd` page for that)
