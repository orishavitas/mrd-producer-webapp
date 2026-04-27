# Documents Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the dashboard "Recent Documents" section into a unified library showing One-Pager and PRD documents with tab filtering, DOCX/HTML download (opens new tab), and delete.

**Architecture:** Add a `listPRDDocuments()` DB helper, a new `GET /api/documents/[id]/export` route for One-Pager download-by-ID, and upgrade `DocumentsTable` with tabs + download buttons. The dashboard server component fetches both sources in parallel and merges them into a unified `LibraryDocument[]` type.

**Tech Stack:** Next.js 15 App Router, TypeScript, Neon Postgres via `lib/db-client.ts` sql helper, existing `lib/db.ts` + `lib/prd-db.ts`, `lib/feature-gate.ts` for PRD visibility gate.

---

## File Structure

**New files:**
- `app/api/documents/[id]/export/route.ts` — GET endpoint, loads One-Pager from DB by ID, returns DOCX or HTML
- `app/api/pipeline/prd/[prd_id]/delete/route.ts` — DELETE endpoint, soft-deletes a PRD document

**Modified files:**
- `lib/prd-db.ts` — add `listPRDDocuments(createdBy)` function
- `lib/db.ts` — add `LibraryDocument` interface, add `listLibraryDocuments()` helper
- `app/page.tsx` — fetch both sources in parallel, merge, pass unified list
- `app/components/DashboardShell.tsx` — accept `LibraryDocument[]`
- `app/components/DocumentsTable.tsx` — add tab bar, download buttons, PRD delete support

**Test files:**
- `__tests__/api/documents/export.test.ts`
- `__tests__/api/pipeline/prd/delete.test.ts`
- `__tests__/components/DocumentsTable.test.tsx` (new test cases added)

---

## Task 1: Add `listPRDDocuments` to prd-db.ts

**Files:**
- Modify: `lib/prd-db.ts`
- Test: `__tests__/lib/prd-db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/prd-db.test.ts`:

```typescript
import { jest } from '@jest/globals';
jest.mock('@/lib/db-client');

import { sql } from '@/lib/db-client';
import { listPRDDocuments } from '@/lib/prd-db';

const mockSql = sql as jest.MockedFunction<typeof sql>;

describe('listPRDDocuments', () => {
  it('returns PRD documents for a given email', async () => {
    const fakeRows = [
      {
        id: 'prd-1',
        run_id: 'run-1',
        source_document_id: 'doc-1',
        product_name: 'EMV Bracket PRD',
        qa_score: 85,
        qa_suggestions: [],
        created_by: 'ori@compulocks.com',
        created_at: '2026-04-23T10:00:00Z',
        updated_at: '2026-04-23T10:00:00Z',
      },
    ];
    (mockSql as unknown as jest.Mock).mockResolvedValueOnce({ rows: fakeRows });

    const result = await listPRDDocuments('ori@compulocks.com');
    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe('EMV Bracket PRD');
  });

  it('returns empty array when no documents exist', async () => {
    (mockSql as unknown as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const result = await listPRDDocuments('nobody@example.com');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="__tests__/lib/prd-db"
```

Expected: FAIL — `listPRDDocuments is not a function`

- [ ] **Step 3: Add `listPRDDocuments` to `lib/prd-db.ts`**

Add after the `getPRDDocumentByRunId` function (around line 118):

```typescript
export async function listPRDDocuments(createdBy: string): Promise<PRDDocument[]> {
  const { rows } = await sql<PRDDocument>`
    SELECT * FROM prd_documents
    WHERE created_by = ${createdBy}
    ORDER BY updated_at DESC
  `;
  return rows;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="__tests__/lib/prd-db"
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/prd-db.ts __tests__/lib/prd-db.test.ts
git commit -m "feat(library): add listPRDDocuments DB helper"
```

---

## Task 2: Add `LibraryDocument` type and `listLibraryDocuments` helper

**Files:**
- Modify: `lib/db.ts`
- Test: `__tests__/lib/library-documents.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/library-documents.test.ts`:

```typescript
import { LibraryDocument, toLibraryDocument, toPRDLibraryDocument } from '@/lib/db';
import type { DocumentWithCreator } from '@/lib/db';
import type { PRDDocument } from '@/lib/prd-db';

describe('toLibraryDocument', () => {
  const base: DocumentWithCreator = {
    id: 'doc-1',
    user_id: 'ori@compulocks.com',
    title: 'EMV Bracket',
    tool_type: 'one-pager',
    status: 'complete',
    drive_file_id: null,
    drive_folder: null,
    content_json: null,
    created_at: '2026-04-23T10:00:00Z',
    updated_at: '2026-04-23T10:00:00Z',
    deleted_at: null,
    creator_name: 'Ori Shavit',
    creator_email: 'ori@compulocks.com',
  };

  it('maps a One-Pager document to LibraryDocument', () => {
    const result = toLibraryDocument(base);
    expect(result.id).toBe('doc-1');
    expect(result.toolType).toBe('one-pager');
    expect(result.title).toBe('EMV Bracket');
    expect(result.exportBaseUrl).toBe('/api/documents/doc-1/export');
    expect(result.deleteUrl).toBe('/api/documents/doc-1');
    expect(result.deleteMethod).toBe('DELETE');
  });
});

describe('toPRDLibraryDocument', () => {
  const prd: PRDDocument = {
    id: 'prd-1',
    run_id: 'run-1',
    source_document_id: 'doc-1',
    product_name: 'EMV PRD v1',
    qa_score: 85,
    qa_suggestions: [],
    created_by: 'ori@compulocks.com',
    created_at: '2026-04-23T10:00:00Z',
    updated_at: '2026-04-23T10:00:00Z',
  };

  it('maps a PRD document to LibraryDocument', () => {
    const result = toPRDLibraryDocument(prd);
    expect(result.id).toBe('prd-1');
    expect(result.toolType).toBe('prd');
    expect(result.title).toBe('EMV PRD v1');
    expect(result.exportBaseUrl).toBe('/api/pipeline/prd/prd-1/export');
    expect(result.deleteUrl).toBe('/api/pipeline/prd/prd-1/delete');
    expect(result.deleteMethod).toBe('DELETE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="__tests__/lib/library-documents"
```

Expected: FAIL — `toLibraryDocument is not a function`

- [ ] **Step 3: Add `LibraryDocument` type and mapper functions to `lib/db.ts`**

Add at the bottom of `lib/db.ts`:

```typescript
export interface LibraryDocument {
  id: string;
  title: string;
  toolType: 'one-pager' | 'prd';
  creatorName: string | null;
  creatorEmail: string | null;
  updatedAt: string;
  exportBaseUrl: string;
  deleteUrl: string;
  deleteMethod: 'DELETE';
}

export function toLibraryDocument(doc: DocumentWithCreator): LibraryDocument {
  return {
    id: doc.id,
    title: doc.title,
    toolType: doc.tool_type as 'one-pager',
    creatorName: doc.creator_name,
    creatorEmail: doc.creator_email,
    updatedAt: doc.updated_at,
    exportBaseUrl: `/api/documents/${doc.id}/export`,
    deleteUrl: `/api/documents/${doc.id}`,
    deleteMethod: 'DELETE',
  };
}

export function toPRDLibraryDocument(doc: import('@/lib/prd-db').PRDDocument): LibraryDocument {
  return {
    id: doc.id,
    title: doc.product_name,
    toolType: 'prd',
    creatorName: null,
    creatorEmail: doc.created_by,
    updatedAt: doc.updated_at,
    exportBaseUrl: `/api/pipeline/prd/${doc.id}/export`,
    deleteUrl: `/api/pipeline/prd/${doc.id}/delete`,
    deleteMethod: 'DELETE',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="__tests__/lib/library-documents"
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts __tests__/lib/library-documents.test.ts
git commit -m "feat(library): add LibraryDocument type and mapper functions"
```

---

## Task 3: GET `/api/documents/[id]/export` — One-Pager download by ID

**Files:**
- Create: `app/api/documents/[id]/export/route.ts`
- Test: `__tests__/api/documents/export.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/documents/export.test.ts`:

```typescript
import { jest } from '@jest/globals';
jest.mock('@/lib/auth');
jest.mock('@/lib/db');

import { auth } from '@/lib/auth';
import { getDocument } from '@/lib/db';
import { GET } from '@/app/api/documents/[id]/export/route';
import { NextRequest } from 'next/server';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetDocument = getDocument as jest.MockedFunction<typeof getDocument>;

const fakeSession = { user: { email: 'ori@compulocks.com', name: 'Ori' } };

describe('GET /api/documents/[id]/export', () => {
  beforeEach(() => {
    (mockAuth as unknown as jest.Mock).mockResolvedValue(fakeSession);
  });

  it('returns 401 when not authenticated', async () => {
    (mockAuth as unknown as jest.Mock).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when document not found', async () => {
    mockGetDocument.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when document belongs to another user', async () => {
    mockGetDocument.mockResolvedValueOnce({
      id: 'doc-1',
      user_id: 'other@compulocks.com',
      title: 'Test',
      tool_type: 'one-pager',
      status: 'complete',
      content_json: {},
      drive_file_id: null,
      drive_folder: null,
      created_at: '2026-04-23T10:00:00Z',
      updated_at: '2026-04-23T10:00:00Z',
      deleted_at: null,
    });
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns HTML when format=html', async () => {
    mockGetDocument.mockResolvedValueOnce({
      id: 'doc-1',
      user_id: 'ori@compulocks.com',
      title: 'EMV Bracket',
      tool_type: 'one-pager',
      status: 'complete',
      content_json: {
        description: 'A bracket',
        goal: 'Secure devices',
        useCases: '',
        context: { environments: [], industries: [] },
        audience: { predefined: [], custom: [] },
        features: { mustHave: [], niceToHave: [] },
        commercials: { moq: '', targetPrice: '' },
        competitors: [],
        productName: 'EMV Bracket',
      },
      drive_file_id: null,
      drive_folder: null,
      created_at: '2026-04-23T10:00:00Z',
      updated_at: '2026-04-23T10:00:00Z',
      deleted_at: null,
    });
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="__tests__/api/documents/export"
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `app/api/documents/[id]/export/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocument } from '@/lib/db';
import { generateOnePagerDocx, generateOnePagerHtml } from '@/lib/one-pager-export';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (doc.user_id !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'docx';
  const data = doc.content_json as Record<string, unknown>;
  const title = doc.title || 'one-pager';

  if (format === 'html') {
    const html = generateOnePagerHtml(data);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${title}.html"`,
      },
    });
  }

  const buffer = await generateOnePagerDocx(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${title}.docx"`,
    },
  });
}
```

- [ ] **Step 4: Extract export functions from `app/api/one-pager/export/route.ts` into `lib/one-pager-export.ts`**

The new route imports `generateOnePagerDocx` and `generateOnePagerHtml` from `lib/one-pager-export.ts`. Extract these two functions (and their helpers: `buildDocxChildren`, `loadLogoBuffer`, `textPara`, `bulletPara`, `labelValue`, `addSection`, `BRAND`) from `app/api/one-pager/export/route.ts` into the new file. Keep the `POST` handler in the original route, importing from the new lib file.

Create `lib/one-pager-export.ts` with:
```typescript
import fs from 'fs';
import path from 'path';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, LevelFormat, convertInchesToTwip, Header, Footer,
  PageNumber, ImageRun, TabStopPosition, TabStopType,
} from 'docx';

// Copy the full OnePagerData interface, BRAND constant, buildDocxChildren,
// loadLogoBuffer, generateOnePagerDocx, and generateOnePagerHtml functions
// verbatim from app/api/one-pager/export/route.ts.
// Export generateOnePagerDocx and generateOnePagerHtml.
```

Then in `app/api/one-pager/export/route.ts`, replace the function definitions with:
```typescript
import { generateOnePagerDocx, generateOnePagerHtml } from '@/lib/one-pager-export';
```

- [ ] **Step 5: Run tests to verify all pass**

```bash
npm test -- --testPathPattern="__tests__/api/documents/export"
```

Expected: PASS — 4 tests passing

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add app/api/documents/[id]/export/route.ts lib/one-pager-export.ts app/api/one-pager/export/route.ts __tests__/api/documents/export.test.ts
git commit -m "feat(library): add GET /api/documents/[id]/export for One-Pager download by ID"
```

---

## Task 4: DELETE `/api/pipeline/prd/[prd_id]/delete` — soft-delete PRD document

**Files:**
- Create: `app/api/pipeline/prd/[prd_id]/delete/route.ts`
- Test: `__tests__/api/pipeline/prd/delete.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/pipeline/prd/delete.test.ts`:

```typescript
import { jest } from '@jest/globals';
jest.mock('@/lib/auth');
jest.mock('@/lib/prd-db');

import { auth } from '@/lib/auth';
import { getPRDDocument } from '@/lib/prd-db';
import { DELETE } from '@/app/api/pipeline/prd/[prd_id]/delete/route';
import { NextRequest } from 'next/server';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetPRDDocument = getPRDDocument as jest.MockedFunction<typeof getPRDDocument>;

const fakeSession = { user: { email: 'ori@compulocks.com' } };
const fakeDoc = {
  id: 'prd-1', run_id: 'run-1', source_document_id: 'doc-1',
  product_name: 'Test PRD', qa_score: null, qa_suggestions: [],
  created_by: 'ori@compulocks.com',
  created_at: '2026-04-23T10:00:00Z', updated_at: '2026-04-23T10:00:00Z',
};

describe('DELETE /api/pipeline/prd/[prd_id]/delete', () => {
  beforeEach(() => {
    (mockAuth as unknown as jest.Mock).mockResolvedValue(fakeSession);
  });

  it('returns 401 when not authenticated', async () => {
    (mockAuth as unknown as jest.Mock).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ prd_id: 'prd-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when PRD not found', async () => {
    mockGetPRDDocument.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ prd_id: 'prd-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when PRD belongs to another user', async () => {
    mockGetPRDDocument.mockResolvedValueOnce({ ...fakeDoc, created_by: 'other@compulocks.com' });
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ prd_id: 'prd-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful delete', async () => {
    mockGetPRDDocument.mockResolvedValueOnce(fakeDoc);
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ prd_id: 'prd-1' }) });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="__tests__/api/pipeline/prd/delete"
```

Expected: FAIL — module not found

- [ ] **Step 3: Add `softDeletePRDDocument` to `lib/prd-db.ts`**

```typescript
export async function softDeletePRDDocument(id: string): Promise<void> {
  await sql`
    UPDATE prd_documents SET updated_at = NOW()
    WHERE id = ${id}
  `;
}
```

Note: `prd_documents` has no `deleted_at` column. Add a real soft-delete column via migration or use a simple marker. Simplest approach that matches existing pattern: add `deleted_at` column.

Add this SQL migration as a comment block at the top of the file for the implementer to run manually:

```sql
-- Run in Neon console before deploying:
ALTER TABLE prd_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
```

Then implement:
```typescript
export async function softDeletePRDDocument(id: string): Promise<void> {
  await sql`
    UPDATE prd_documents SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `;
}
```

And update `getPRDDocument` and `listPRDDocuments` to filter `deleted_at IS NULL`:
```typescript
// getPRDDocument — add AND deleted_at IS NULL
SELECT * FROM prd_documents WHERE id = ${id} AND deleted_at IS NULL

// listPRDDocuments — add AND deleted_at IS NULL  
SELECT * FROM prd_documents WHERE created_by = ${createdBy} AND deleted_at IS NULL ORDER BY updated_at DESC
```

- [ ] **Step 4: Create `app/api/pipeline/prd/[prd_id]/delete/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPRDDocument, softDeletePRDDocument } from '@/lib/prd-db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ prd_id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prd_id } = await params;
  const doc = await getPRDDocument(prd_id);

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (doc.created_by !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await softDeletePRDDocument(prd_id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Run tests to verify all pass**

```bash
npm test -- --testPathPattern="__tests__/api/pipeline/prd/delete"
```

Expected: PASS — 4 tests passing

- [ ] **Step 6: Commit**

```bash
git add app/api/pipeline/prd/[prd_id]/delete/route.ts lib/prd-db.ts __tests__/api/pipeline/prd/delete.test.ts
git commit -m "feat(library): add DELETE /api/pipeline/prd/[prd_id]/delete endpoint"
```

---

## Task 5: Upgrade `DocumentsTable` with tabs and download buttons

**Files:**
- Modify: `app/components/DocumentsTable.tsx`
- Modify: `app/components/DashboardShell.tsx`
- Test: `__tests__/components/DocumentsTable.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/DocumentsTable.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentsTable from '@/app/components/DocumentsTable';
import type { LibraryDocument } from '@/lib/db';

const onePager: LibraryDocument = {
  id: 'doc-1',
  title: 'EMV Bracket',
  toolType: 'one-pager',
  creatorName: 'Ori Shavit',
  creatorEmail: 'ori@compulocks.com',
  updatedAt: '2026-04-23T10:00:00Z',
  exportBaseUrl: '/api/documents/doc-1/export',
  deleteUrl: '/api/documents/doc-1',
  deleteMethod: 'DELETE',
};

const prdDoc: LibraryDocument = {
  id: 'prd-1',
  title: 'EMV PRD v1',
  toolType: 'prd',
  creatorName: null,
  creatorEmail: 'ori@compulocks.com',
  updatedAt: '2026-04-23T11:00:00Z',
  exportBaseUrl: '/api/pipeline/prd/prd-1/export',
  deleteUrl: '/api/pipeline/prd/prd-1/delete',
  deleteMethod: 'DELETE',
};

describe('DocumentsTable', () => {
  it('renders all documents under All tab', () => {
    render(<DocumentsTable documents={[onePager, prdDoc]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    expect(screen.getByText('EMV Bracket')).toBeInTheDocument();
    expect(screen.getByText('EMV PRD v1')).toBeInTheDocument();
  });

  it('filters to One-Pager tab', () => {
    render(<DocumentsTable documents={[onePager, prdDoc]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    fireEvent.click(screen.getByText('One-Pager'));
    expect(screen.getByText('EMV Bracket')).toBeInTheDocument();
    expect(screen.queryByText('EMV PRD v1')).not.toBeInTheDocument();
  });

  it('filters to PRD tab', () => {
    render(<DocumentsTable documents={[onePager, prdDoc]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    fireEvent.click(screen.getByText('PRD'));
    expect(screen.queryByText('EMV Bracket')).not.toBeInTheDocument();
    expect(screen.getByText('EMV PRD v1')).toBeInTheDocument();
  });

  it('renders DOCX and HTML links with correct hrefs', () => {
    render(<DocumentsTable documents={[onePager]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    const docxLink = screen.getByText('DOCX').closest('a');
    const htmlLink = screen.getByText('HTML').closest('a');
    expect(docxLink).toHaveAttribute('href', '/api/documents/doc-1/export?format=docx');
    expect(docxLink).toHaveAttribute('target', '_blank');
    expect(htmlLink).toHaveAttribute('href', '/api/documents/doc-1/export?format=html');
    expect(htmlLink).toHaveAttribute('target', '_blank');
  });

  it('hides PRD tab when no PRD documents', () => {
    render(<DocumentsTable documents={[onePager]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    expect(screen.queryByText('PRD')).not.toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    render(<DocumentsTable documents={[]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    expect(screen.getByText(/No documents yet/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="__tests__/components/DocumentsTable"
```

Expected: FAIL — various assertion failures (old component doesn't accept LibraryDocument)

- [ ] **Step 3: Rewrite `app/components/DocumentsTable.tsx`**

```typescript
'use client';

import { useState } from 'react';
import type { LibraryDocument } from '@/lib/db';

interface DocumentsTableProps {
  documents: LibraryDocument[];
  onDelete?: (id: string) => void;
  currentUserEmail: string;
}

type TabType = 'all' | 'one-pager' | 'prd';

const TOOL_LABELS: Record<string, string> = {
  'one-pager': 'One-Pager',
  prd: 'PRD',
};

const BADGE_STYLES: Record<string, { background: string; color: string }> = {
  'one-pager': { background: 'var(--brand-highlight)', color: '#9bb' },
  prd: { background: '#1a2a1a', color: 'var(--brand-green-dark)' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function DocumentsTable({ documents, onDelete, currentUserEmail }: DocumentsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasPRD = documents.some((d) => d.toolType === 'prd');

  const filtered = activeTab === 'all'
    ? documents
    : documents.filter((d) => d.toolType === activeTab);

  const handleDelete = async (doc: LibraryDocument) => {
    if (!confirm('Delete this document?')) return;
    setDeletingId(doc.id);
    try {
      await fetch(doc.deleteUrl, { method: doc.deleteMethod });
      onDelete?.(doc.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
        No documents yet. Generate your first one above.
      </p>
    );
  }

  const tabStyle = (tab: TabType): React.CSSProperties => ({
    padding: '7px 16px',
    fontSize: '0.8rem',
    fontWeight: activeTab === tab ? 600 : 400,
    color: activeTab === tab ? 'var(--foreground)' : 'var(--muted)',
    borderBottom: activeTab === tab ? '2px solid var(--brand-green-dark)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--brand-green-dark)' : '2px solid transparent',
    cursor: 'pointer',
    paddingBottom: '7px',
  });

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
        <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>All</button>
        <button style={tabStyle('one-pager')} onClick={() => setActiveTab('one-pager')}>One-Pager</button>
        {hasPRD && (
          <button style={tabStyle('prd')} onClick={() => setActiveTab('prd')}>PRD</button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Title', 'Type', 'Creator', 'Updated', ''].map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600,
                  color: 'var(--muted)', fontSize: '0.75rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => {
              const badge = BADGE_STYLES[doc.toolType] ?? { background: 'var(--border)', color: 'var(--muted)' };
              return (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem 0.75rem', fontWeight: 500 }}>{doc.title}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <span style={{
                      ...badge, fontSize: '0.72rem', fontWeight: 600,
                      padding: '0.15rem 0.55rem', borderRadius: '999px',
                    }}>
                      {TOOL_LABELS[doc.toolType] ?? doc.toolType}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {doc.creatorName || doc.creatorEmail || '—'}
                    {doc.creatorEmail === currentUserEmail && (
                      <span style={{
                        marginLeft: '0.4rem', fontSize: '0.7rem', fontWeight: 600,
                        color: 'var(--accent)', background: 'var(--accent-soft)',
                        padding: '0.1rem 0.35rem', borderRadius: '999px',
                      }}>you</span>
                    )}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {formatDate(doc.updatedAt)}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <a
                        href={`${doc.exportBaseUrl}?format=docx`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'var(--brand-green-dark)', color: '#fff',
                          padding: '0.2rem 0.6rem', borderRadius: '4px',
                          fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                        }}
                      >DOCX</a>
                      <a
                        href={`${doc.exportBaseUrl}?format=html`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'var(--brand-highlight)', color: '#9bb',
                          padding: '0.2rem 0.6rem', borderRadius: '4px',
                          fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                        }}
                      >HTML</a>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--muted)', fontSize: '0.8rem', padding: '0.2rem 0.3rem',
                        }}
                        aria-label="Delete document"
                      >
                        {deletingId === doc.id ? '...' : '✕'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `app/components/DashboardShell.tsx` to accept `LibraryDocument[]`**

```typescript
'use client';

import { useState } from 'react';
import type { LibraryDocument } from '@/lib/db';
import DocumentsTable from './DocumentsTable';

interface DashboardShellProps {
  initialDocuments: LibraryDocument[];
  currentUserEmail: string;
}

export default function DashboardShell({ initialDocuments, currentUserEmail }: DashboardShellProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>(initialDocuments);

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        Documents
      </h2>
      <DocumentsTable documents={documents} onDelete={handleDelete} currentUserEmail={currentUserEmail} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="__tests__/components/DocumentsTable"
```

Expected: PASS — 6 tests passing

- [ ] **Step 6: Commit**

```bash
git add app/components/DocumentsTable.tsx app/components/DashboardShell.tsx __tests__/components/DocumentsTable.test.tsx
git commit -m "feat(library): upgrade DocumentsTable with tabs, DOCX/HTML download buttons"
```

---

## Task 6: Wire dashboard server component to fetch both sources

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update `app/page.tsx`**

Replace the data-fetching section and `DashboardShell` call:

```typescript
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listDocumentsWithCreator, toLibraryDocument, toPRDLibraryDocument, type LibraryDocument } from '@/lib/db';
import { listPRDDocuments } from '@/lib/prd-db';
import { getFeaturesForEmail } from '@/lib/feature-gate';
import TopBar from './components/TopBar';
import ToolCard from './components/ToolCard';
import DashboardShell from './components/DashboardShell';

// ... ALL_TOOLS array unchanged ...

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const email = session.user.email;
  const features = getFeaturesForEmail(email);
  const hasPRD = features.has('prd-producer');

  let libraryDocs: LibraryDocument[] = [];
  try {
    const [opDocs, prdDocs] = await Promise.all([
      listDocumentsWithCreator(email),
      hasPRD ? listPRDDocuments(email) : Promise.resolve([]),
    ]);
    libraryDocs = [
      ...opDocs
        .filter((d) => d.tool_type === 'one-pager')
        .map(toLibraryDocument),
      ...prdDocs.map(toPRDLibraryDocument),
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    // DB not configured — show empty state
  }

  const tools = ALL_TOOLS.filter((t) => features.has(t.feature));

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="container" style={{ maxWidth: '900px', padding: '2rem 1.5rem' }}>
          <header style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Welcome{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Choose a tool to get started.</p>
          </header>

          <section>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
              Tools
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {tools.map(({ feature: _, ...tool }) => (
                <ToolCard key={tool.href} {...tool} />
              ))}
            </div>
          </section>

          <DashboardShell initialDocuments={libraryDocs} currentUserEmail={email} />
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^.*error" | grep -v node_modules
```

Expected: clean build, no TypeScript errors

- [ ] **Step 3: Smoke test locally**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- Documents section shows with tabs
- DOCX/HTML links point to correct URLs
- PRD tab only appears if you have PRD documents

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(library): wire dashboard to fetch One-Pager + PRD docs, unified library view"
```

---

## Task 7: Final verification and push

- [ ] **Step 1: Run full PRD + library test suite**

```bash
npm test -- --testPathPattern="__tests__/agents/prd|__tests__/api/pipeline|__tests__/middleware|__tests__/components/prd|__tests__/lib/prd|__tests__/api/documents|__tests__/components/DocumentsTable|__tests__/lib/library"
```

Expected: all tests pass (AI-dependent skipped)

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: clean build

- [ ] **Step 3: Push**

```bash
git push origin main
```
