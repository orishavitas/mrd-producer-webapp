# GCS Document Storage + Google Drive Save/Export Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Postgres-backed One-Pager document storage with GCS JSON files, and add Google Drive save/export routing (versioned exports, overwritten JSON clone, appended changelog) into two existing master folders, organized into per-project subfolders.

**Architecture:** A new `lib/gcs/` module owns canonical document read/write (envelope shape, generation-match concurrency). A new `lib/drive/` module owns Drive folder resolution and file writes, built on the same service-account credentials already used for Google Sheets (`GOOGLE_SERVICE_ACCOUNT_JSON`). The existing One-Pager save/export routes are rewired to call these two modules instead of `lib/db.ts`/Postgres. PRD is *not* migrated in this plan — see the companion PRD rebuild plan, which depends on this one.

**Tech Stack:** `@google-cloud/storage` (new dependency), `googleapis` (already installed) for Drive API, `google-auth-library` `JWT` (already used in `lib/google-sheets.ts`), Next.js 14 route handlers, Jest + ts-jest.

## Global Constraints

- Path alias `@/*` = project root (from `CLAUDE.md`).
- Tests live in `__tests__/` mirroring source, run via `npm test`.
- Never hardcode hex colors or duplicate brand tokens — not relevant to this backend-only plan, noted for completeness per `CLAUDE.md`.
- Feature allowlist stays in Postgres — do not touch `lib/feature-gate.ts` schema in this plan.
- MRD (`/mrd`, `/mrd-generator`) is out of scope — do not touch its storage path.
- Service account auth reuses `GOOGLE_SERVICE_ACCOUNT_JSON` (base64-encoded JSON), the same env var `lib/google-sheets.ts` already reads — do not introduce a second credentials env var.

---

### Task 1: Add GCS dependency and bucket env var

**Files:**
- Modify: `package.json`
- Modify: `.env.example` (or create if absent — check first)

**Interfaces:**
- Produces: `GCS_BUCKET_NAME` env var, `@google-cloud/storage` package available to import.

- [ ] **Step 1: Install the package**

Run: `npm install @google-cloud/storage`
Expected: `package.json` and `package-lock.json` updated, no errors.

- [ ] **Step 2: Add env var documentation**

Check if `.env.example` exists:
Run: `ls .env.example 2>/dev/null || echo "not found"`

If it exists, add this line (grouped near other `GOOGLE_*` vars):
```
GCS_BUCKET_NAME=              # GCS bucket for One-Pager/PRD document storage (e.g. mrd-producer-documents)
```

If it doesn't exist, skip this step (repo has no example env file convention to follow).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add @google-cloud/storage dependency"
```

---

### Task 2: GCS document envelope read/write module

**Files:**
- Create: `lib/gcs/gcs-client.ts`
- Create: `lib/gcs/documents.ts`
- Test: `__tests__/lib/gcs/documents.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/gcs/gcs-client.ts
  export function getStorageClient(): Storage  // from @google-cloud/storage

  // lib/gcs/documents.ts
  export interface DocumentEnvelope {
    id: string;
    toolType: 'one-pager' | 'prd';
    productName: string;
    userId: string;
    creatorName: string | null;
    creatorEmail: string | null;
    status: 'draft' | 'published';
    version: string;
    contentJson: Record<string, unknown>;
    versionHistory: { version: string; savedAt: string; contentJson: Record<string, unknown> }[];
    driveFolderId: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }
  export async function getDocumentEnvelope(toolType: 'one-pager' | 'prd', id: string): Promise<DocumentEnvelope | null>
  export async function createDocumentEnvelope(params: {
    toolType: 'one-pager' | 'prd';
    productName: string;
    userId: string;
    creatorName?: string;
    creatorEmail?: string;
    contentJson: Record<string, unknown>;
  }): Promise<DocumentEnvelope>
  export async function saveDocumentEnvelope(envelope: DocumentEnvelope): Promise<DocumentEnvelope>
  export async function listDocumentEnvelopes(toolType: 'one-pager' | 'prd', userId?: string): Promise<DocumentEnvelope[]>
  export class GenerationConflictError extends Error {}
  ```
- Consumes: nothing from other tasks (this is the foundation).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/gcs/documents.test.ts`:

```ts
import { jest } from '@jest/globals';

const mockFile = {
  exists: jest.fn(),
  download: jest.fn(),
  save: jest.fn(),
  getMetadata: jest.fn(),
};
const mockBucket = {
  file: jest.fn(() => mockFile),
  getFiles: jest.fn(),
};
const mockStorage = {
  bucket: jest.fn(() => mockBucket),
};

jest.mock('@/lib/gcs/gcs-client', () => ({
  getStorageClient: () => mockStorage,
}));

process.env.GCS_BUCKET_NAME = 'test-bucket';

import {
  getDocumentEnvelope,
  createDocumentEnvelope,
  saveDocumentEnvelope,
  GenerationConflictError,
} from '@/lib/gcs/documents';

describe('getDocumentEnvelope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when file does not exist', async () => {
    mockFile.exists.mockResolvedValue([false]);
    const result = await getDocumentEnvelope('one-pager', 'abc-123');
    expect(result).toBeNull();
    expect(mockBucket.file).toHaveBeenCalledWith('one-pager/abc-123.json');
  });

  it('parses and returns the envelope when file exists', async () => {
    const envelope = {
      id: 'abc-123',
      toolType: 'one-pager',
      productName: 'Widget',
      userId: 'u@x.com',
      creatorName: null,
      creatorEmail: null,
      status: 'draft',
      version: '0.1',
      contentJson: { foo: 'bar' },
      versionHistory: [],
      driveFolderId: null,
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    mockFile.exists.mockResolvedValue([true]);
    mockFile.download.mockResolvedValue([Buffer.from(JSON.stringify(envelope))]);
    const result = await getDocumentEnvelope('one-pager', 'abc-123');
    expect(result).toEqual(envelope);
  });
});

describe('createDocumentEnvelope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new envelope with version 0.1 and saves it to GCS', async () => {
    mockFile.save.mockResolvedValue(undefined);
    const result = await createDocumentEnvelope({
      toolType: 'one-pager',
      productName: 'Widget',
      userId: 'u@x.com',
      contentJson: { foo: 'bar' },
    });
    expect(result.version).toBe('0.1');
    expect(result.status).toBe('draft');
    expect(result.productName).toBe('Widget');
    expect(typeof result.id).toBe('string');
    expect(mockFile.save).toHaveBeenCalled();
  });
});

describe('saveDocumentEnvelope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes with ifGenerationMatch precondition using cached metageneration', async () => {
    mockFile.getMetadata.mockResolvedValue([{ generation: '42' }]);
    mockFile.save.mockResolvedValue(undefined);
    const envelope = {
      id: 'abc-123', toolType: 'one-pager' as const, productName: 'Widget',
      userId: 'u@x.com', creatorName: null, creatorEmail: null,
      status: 'draft' as const, version: '0.2', contentJson: {}, versionHistory: [],
      driveFolderId: null, deletedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await saveDocumentEnvelope(envelope);
    expect(mockFile.save).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ preconditionOpts: expect.objectContaining({ ifGenerationMatch: 42 }) })
    );
  });

  it('throws GenerationConflictError on a 412 precondition failure', async () => {
    mockFile.getMetadata.mockResolvedValue([{ generation: '42' }]);
    const preconditionError = Object.assign(new Error('failed precondition'), { code: 412 });
    mockFile.save.mockRejectedValue(preconditionError);
    const envelope = {
      id: 'abc-123', toolType: 'one-pager' as const, productName: 'Widget',
      userId: 'u@x.com', creatorName: null, creatorEmail: null,
      status: 'draft' as const, version: '0.2', contentJson: {}, versionHistory: [],
      driveFolderId: null, deletedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await expect(saveDocumentEnvelope(envelope)).rejects.toThrow(GenerationConflictError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/gcs/documents.test.ts`
Expected: FAIL — `Cannot find module '@/lib/gcs/gcs-client'` (files don't exist yet).

- [ ] **Step 3: Implement `lib/gcs/gcs-client.ts`**

```ts
import { Storage } from '@google-cloud/storage';

let _storage: Storage | null = null;

function getCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
}

export function getStorageClient(): Storage {
  if (!_storage) {
    const creds = getCredentials();
    _storage = new Storage({
      projectId: creds.project_id,
      credentials: { client_email: creds.client_email, private_key: creds.private_key },
    });
  }
  return _storage;
}

export function getBucketName(): string {
  const name = process.env.GCS_BUCKET_NAME;
  if (!name) throw new Error('GCS_BUCKET_NAME not set');
  return name;
}
```

- [ ] **Step 4: Implement `lib/gcs/documents.ts`**

```ts
import { randomUUID } from 'crypto';
import { getStorageClient, getBucketName } from '@/lib/gcs/gcs-client';

export interface DocumentEnvelope {
  id: string;
  toolType: 'one-pager' | 'prd';
  productName: string;
  userId: string;
  creatorName: string | null;
  creatorEmail: string | null;
  status: 'draft' | 'published';
  version: string;
  contentJson: Record<string, unknown>;
  versionHistory: { version: string; savedAt: string; contentJson: Record<string, unknown> }[];
  driveFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class GenerationConflictError extends Error {
  constructor(id: string) {
    super(`Document ${id} was modified concurrently — reload and retry`);
    this.name = 'GenerationConflictError';
  }
}

function objectPath(toolType: 'one-pager' | 'prd', id: string): string {
  return `${toolType}/${id}.json`;
}

export async function getDocumentEnvelope(
  toolType: 'one-pager' | 'prd',
  id: string
): Promise<DocumentEnvelope | null> {
  const bucket = getStorageClient().bucket(getBucketName());
  const file = bucket.file(objectPath(toolType, id));
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return JSON.parse(buf.toString('utf-8')) as DocumentEnvelope;
}

export async function createDocumentEnvelope(params: {
  toolType: 'one-pager' | 'prd';
  productName: string;
  userId: string;
  creatorName?: string;
  creatorEmail?: string;
  contentJson: Record<string, unknown>;
}): Promise<DocumentEnvelope> {
  const now = new Date().toISOString();
  const envelope: DocumentEnvelope = {
    id: randomUUID(),
    toolType: params.toolType,
    productName: params.productName,
    userId: params.userId,
    creatorName: params.creatorName ?? null,
    creatorEmail: params.creatorEmail ?? null,
    status: 'draft',
    version: '0.1',
    contentJson: params.contentJson,
    versionHistory: [],
    driveFolderId: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const bucket = getStorageClient().bucket(getBucketName());
  const file = bucket.file(objectPath(envelope.toolType, envelope.id));
  await file.save(JSON.stringify(envelope), { contentType: 'application/json' });
  return envelope;
}

export async function saveDocumentEnvelope(envelope: DocumentEnvelope): Promise<DocumentEnvelope> {
  const bucket = getStorageClient().bucket(getBucketName());
  const file = bucket.file(objectPath(envelope.toolType, envelope.id));

  let generation: number | undefined;
  try {
    const [metadata] = await file.getMetadata();
    generation = metadata.generation ? Number(metadata.generation) : undefined;
  } catch {
    generation = 0; // file doesn't exist yet — precondition "must not exist"
  }

  const updated: DocumentEnvelope = { ...envelope, updatedAt: new Date().toISOString() };

  try {
    await file.save(JSON.stringify(updated), {
      contentType: 'application/json',
      preconditionOpts: { ifGenerationMatch: generation },
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 412) throw new GenerationConflictError(envelope.id);
    throw err;
  }

  return updated;
}

export async function listDocumentEnvelopes(
  toolType: 'one-pager' | 'prd',
  userId?: string
): Promise<DocumentEnvelope[]> {
  const bucket = getStorageClient().bucket(getBucketName());
  const [files] = await bucket.getFiles({ prefix: `${toolType}/` });
  const envelopes: DocumentEnvelope[] = [];
  for (const file of files) {
    if (!file.name.endsWith('.json') || file.name.endsWith('_index.json')) continue;
    const [buf] = await file.download();
    const envelope = JSON.parse(buf.toString('utf-8')) as DocumentEnvelope;
    if (envelope.deletedAt) continue;
    if (!userId || envelope.userId === userId) envelopes.push(envelope);
  }
  return envelopes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
```

Note: this lists by downloading every object under the prefix — acceptable at current document counts (single-digit-team usage). The `_index.json` lookup-by-id optimization from the original spec is deferred; add it later if the bucket grows large enough that per-list latency becomes noticeable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/gcs/documents.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/gcs/gcs-client.ts lib/gcs/documents.ts __tests__/lib/gcs/documents.test.ts
git commit -m "feat: add GCS-backed document envelope storage"
```

---

### Task 3: Drive service account client and folder resolution

**Files:**
- Create: `lib/drive/drive-client.ts`
- Create: `lib/drive/folder-resolver.ts`
- Test: `__tests__/lib/drive/folder-resolver.test.ts`

**Interfaces:**
- Consumes: `DocumentEnvelope` from Task 2 (`lib/gcs/documents.ts`) — only the `driveFolderId` and `productName` fields.
- Produces:
  ```ts
  // lib/drive/drive-client.ts
  export function getDriveClient(): drive_v3.Drive  // from googleapis

  // lib/drive/folder-resolver.ts
  export const MASTER_FOLDERS = {
    'one-pager': '1iQvjoIRgRmP8tiUY1pPhT6ecrx_jNftl',
    prd: '1vUjZ1yaJCQ_azpAUs56pfAlCgTMqsaNw',
  } as const;
  export async function resolveProjectFolder(
    toolType: 'one-pager' | 'prd',
    productName: string,
    cachedFolderId: string | null
  ): Promise<string>
  ```

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/drive/folder-resolver.test.ts`:

```ts
import { jest } from '@jest/globals';

const mockFilesGet = jest.fn();
const mockFilesList = jest.fn();
const mockFilesCreate = jest.fn();

jest.mock('@/lib/drive/drive-client', () => ({
  getDriveClient: () => ({
    files: { get: mockFilesGet, list: mockFilesList, create: mockFilesCreate },
  }),
}));

import { resolveProjectFolder, MASTER_FOLDERS } from '@/lib/drive/folder-resolver';

describe('resolveProjectFolder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the cached folder id if it still exists', async () => {
    mockFilesGet.mockResolvedValue({ data: { id: 'cached-folder-id', trashed: false } });
    const id = await resolveProjectFolder('one-pager', 'Widget', 'cached-folder-id');
    expect(id).toBe('cached-folder-id');
    expect(mockFilesList).not.toHaveBeenCalled();
  });

  it('falls back to search when cached id is trashed', async () => {
    mockFilesGet.mockResolvedValue({ data: { id: 'cached-folder-id', trashed: true } });
    mockFilesList.mockResolvedValue({ data: { files: [{ id: 'found-folder-id', name: 'Widget' }] } });
    const id = await resolveProjectFolder('one-pager', 'Widget', 'cached-folder-id');
    expect(id).toBe('found-folder-id');
    expect(mockFilesList).toHaveBeenCalledWith(
      expect.objectContaining({
        q: expect.stringContaining(MASTER_FOLDERS['one-pager']),
      })
    );
  });

  it('falls back to search when there is no cached id', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [{ id: 'found-folder-id', name: 'Widget' }] } });
    const id = await resolveProjectFolder('prd', 'Widget', null);
    expect(id).toBe('found-folder-id');
    expect(mockFilesGet).not.toHaveBeenCalled();
  });

  it('creates a new folder when search finds nothing', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });
    mockFilesCreate.mockResolvedValue({ data: { id: 'new-folder-id' } });
    const id = await resolveProjectFolder('prd', 'New Product', null);
    expect(id).toBe('new-folder-id');
    expect(mockFilesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: 'New Product',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [MASTER_FOLDERS.prd],
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/drive/folder-resolver.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/drive/drive-client.ts`**

```ts
import { google, drive_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';

let _drive: drive_v3.Drive | null = null;

function getCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
}

export function getDriveClient(): drive_v3.Drive {
  if (!_drive) {
    const creds = getCredentials();
    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    _drive = google.drive({ version: 'v3', auth });
  }
  return _drive;
}
```

- [ ] **Step 4: Implement `lib/drive/folder-resolver.ts`**

```ts
import { getDriveClient } from '@/lib/drive/drive-client';

export const MASTER_FOLDERS = {
  'one-pager': '1iQvjoIRgRmP8tiUY1pPhT6ecrx_jNftl',
  prd: '1vUjZ1yaJCQ_azpAUs56pfAlCgTMqsaNw',
} as const;

function escapeForDriveQuery(name: string): string {
  return name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findOrCreateFolder(
  toolType: 'one-pager' | 'prd',
  productName: string
): Promise<string> {
  const drive = getDriveClient();
  const masterId = MASTER_FOLDERS[toolType];
  const escapedName = escapeForDriveQuery(productName);

  const { data } = await drive.files.list({
    q: `'${masterId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const existing = data.files?.[0];
  if (existing?.id) return existing.id;

  const { data: created } = await drive.files.create({
    requestBody: {
      name: productName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [masterId],
    },
    fields: 'id',
  });

  if (!created.id) throw new Error(`Failed to create Drive folder for ${productName}`);
  return created.id;
}

export async function resolveProjectFolder(
  toolType: 'one-pager' | 'prd',
  productName: string,
  cachedFolderId: string | null
): Promise<string> {
  if (cachedFolderId) {
    try {
      const drive = getDriveClient();
      const { data } = await drive.files.get({ fileId: cachedFolderId, fields: 'id, trashed' });
      if (data.id && !data.trashed) return data.id;
    } catch {
      // cached id no longer resolves (deleted, permissions changed) — fall through to search
    }
  }
  return findOrCreateFolder(toolType, productName);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/drive/folder-resolver.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/drive/drive-client.ts lib/drive/folder-resolver.ts __tests__/lib/drive/folder-resolver.test.ts
git commit -m "feat: add Drive service-account client and project folder resolver"
```

---

### Task 4: Drive file writer — versioned exports, JSON clone, changelog

**Files:**
- Create: `lib/drive/drive-sync.ts`
- Test: `__tests__/lib/drive/drive-sync.test.ts`

**Interfaces:**
- Consumes:
  - `resolveProjectFolder(toolType, productName, cachedFolderId)` from Task 3.
  - `getDriveClient()` from Task 3.
  - `DocumentEnvelope` shape from Task 2.
- Produces:
  ```ts
  export interface DriveSyncExports {
    docx?: Buffer;
    html?: string;
    pdf?: Buffer;
  }
  export interface DriveSyncResult {
    driveFolderId: string;
    ok: boolean;        // false if any step failed — caller shows non-blocking warning
    error?: string;
  }
  export async function saveDocumentToDrive(
    envelope: { id: string; toolType: 'one-pager' | 'prd'; productName: string; version: string; status: 'draft' | 'published'; contentJson: Record<string, unknown>; driveFolderId: string | null },
    exports: DriveSyncExports,
    changeSummary: string,
    savedBy: string
  ): Promise<DriveSyncResult>
  ```

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/drive/drive-sync.test.ts`:

```ts
import { jest } from '@jest/globals';

const mockResolveProjectFolder = jest.fn();
jest.mock('@/lib/drive/folder-resolver', () => ({
  resolveProjectFolder: (...args: unknown[]) => mockResolveProjectFolder(...args),
  MASTER_FOLDERS: { 'one-pager': 'mp-op', prd: 'mp-prd' },
}));

const mockFilesList = jest.fn();
const mockFilesCreate = jest.fn();
const mockFilesUpdate = jest.fn();
const mockFilesGet = jest.fn();
jest.mock('@/lib/drive/drive-client', () => ({
  getDriveClient: () => ({
    files: { list: mockFilesList, create: mockFilesCreate, update: mockFilesUpdate, get: mockFilesGet },
  }),
}));

import { saveDocumentToDrive } from '@/lib/drive/drive-sync';

const baseEnvelope = {
  id: 'doc-1',
  toolType: 'one-pager' as const,
  productName: 'Widget',
  version: '0.2',
  status: 'draft' as const,
  contentJson: { foo: 'bar' },
  driveFolderId: null,
};

describe('saveDocumentToDrive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveProjectFolder.mockResolvedValue('resolved-folder-id');
    mockFilesList.mockResolvedValue({ data: { files: [] } }); // no existing changelog
    mockFilesCreate.mockResolvedValue({ data: { id: 'new-file-id' } });
  });

  it('resolves the folder and uploads a versioned docx export without overwriting', async () => {
    const result = await saveDocumentToDrive(
      baseEnvelope,
      { docx: Buffer.from('docx-bytes') },
      'Initial save',
      'ori@compulocks.com'
    );
    expect(result.ok).toBe(true);
    expect(result.driveFolderId).toBe('resolved-folder-id');
    const docxCall = mockFilesCreate.mock.calls.find((c) =>
      (c[0].requestBody.name as string).endsWith('.docx')
    );
    expect(docxCall).toBeDefined();
    expect(docxCall![0].requestBody.name).toContain('Widget');
    expect(docxCall![0].requestBody.name).toContain('v0.2');
  });

  it('overwrites the existing JSON clone in place instead of creating a new one', async () => {
    mockFilesList.mockImplementation(({ q }: { q: string }) => {
      if (q.includes('.json')) {
        return Promise.resolve({ data: { files: [{ id: 'existing-json-id', name: 'Widget.json' }] } });
      }
      return Promise.resolve({ data: { files: [] } });
    });
    await saveDocumentToDrive(baseEnvelope, {}, 'Update', 'ori@compulocks.com');
    expect(mockFilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'existing-json-id' })
    );
    const jsonCreateCall = mockFilesCreate.mock.calls.find((c) =>
      (c[0].requestBody.name as string).endsWith('.json')
    );
    expect(jsonCreateCall).toBeUndefined();
  });

  it('appends to an existing changelog rather than replacing it', async () => {
    mockFilesList.mockImplementation(({ q }: { q: string }) => {
      if (q.includes('Changelog')) {
        return Promise.resolve({ data: { files: [{ id: 'changelog-id', name: 'Widget - Changelog.md' }] } });
      }
      return Promise.resolve({ data: { files: [] } });
    });
    mockFilesGet.mockResolvedValue({ data: '## v0.1 — existing entry\n' });
    await saveDocumentToDrive(baseEnvelope, {}, 'Second save', 'ori@compulocks.com');
    expect(mockFilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'changelog-id',
        media: expect.objectContaining({
          body: expect.stringContaining('existing entry'),
        }),
      })
    );
  });

  it('returns ok: false with an error message when a Drive call throws, without throwing itself', async () => {
    mockResolveProjectFolder.mockRejectedValue(new Error('Drive unreachable'));
    const result = await saveDocumentToDrive(baseEnvelope, {}, 'Save', 'ori@compulocks.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Drive unreachable');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/drive/drive-sync.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/drive/drive-sync.ts`**

```ts
import { getDriveClient } from '@/lib/drive/drive-client';
import { resolveProjectFolder } from '@/lib/drive/folder-resolver';

export interface DriveSyncExports {
  docx?: Buffer;
  html?: string;
  pdf?: Buffer;
}

export interface DriveSyncResult {
  driveFolderId: string;
  ok: boolean;
  error?: string;
}

interface SyncableEnvelope {
  id: string;
  toolType: 'one-pager' | 'prd';
  productName: string;
  version: string;
  status: 'draft' | 'published';
  contentJson: Record<string, unknown>;
  driveFolderId: string | null;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function typeLabel(toolType: 'one-pager' | 'prd'): string {
  return toolType === 'one-pager' ? 'One-Pager' : 'PRD';
}

async function findFileInFolder(folderId: string, exactName: string): Promise<string | null> {
  const drive = getDriveClient();
  const escaped = exactName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escaped}' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  return data.files?.[0]?.id ?? null;
}

async function uploadVersioned(
  folderId: string,
  name: string,
  content: Buffer | string,
  mimeType: string
): Promise<void> {
  const drive = getDriveClient();
  await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: content },
    fields: 'id',
  });
}

async function upsertOverwrite(
  folderId: string,
  name: string,
  content: string,
  mimeType: string
): Promise<void> {
  const drive = getDriveClient();
  const existingId = await findFileInFolder(folderId, name);
  if (existingId) {
    await drive.files.update({ fileId: existingId, media: { mimeType, body: content } });
  } else {
    await drive.files.create({
      requestBody: { name, parents: [folderId] },
      media: { mimeType, body: content },
      fields: 'id',
    });
  }
}

async function appendChangelog(
  folderId: string,
  productName: string,
  version: string,
  status: string,
  changeSummary: string,
  savedBy: string
): Promise<void> {
  const drive = getDriveClient();
  const changelogName = `${productName} - Changelog.md`;
  const existingId = await findFileInFolder(folderId, changelogName);

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const entry = `## v${version} — ${timestamp} — ${savedBy}\n- Status: ${status}\n- Summary: ${changeSummary}\n\n`;

  if (existingId) {
    const { data: existingContent } = await drive.files.get({ fileId: existingId, alt: 'media' });
    const merged = `${String(existingContent)}${entry}`;
    await drive.files.update({ fileId: existingId, media: { mimeType: 'text/markdown', body: merged } });
  } else {
    await drive.files.create({
      requestBody: { name: changelogName, parents: [folderId] },
      media: { mimeType: 'text/markdown', body: entry },
      fields: 'id',
    });
  }
}

export async function saveDocumentToDrive(
  envelope: SyncableEnvelope,
  exports: DriveSyncExports,
  changeSummary: string,
  savedBy: string
): Promise<DriveSyncResult> {
  try {
    const folderId = await resolveProjectFolder(envelope.toolType, envelope.productName, envelope.driveFolderId);
    const label = typeLabel(envelope.toolType);
    const stamp = todayStamp();
    const baseName = `${envelope.productName} - ${label} - v${envelope.version} - ${stamp}`;

    const uploads: Promise<void>[] = [];
    if (exports.docx) {
      uploads.push(
        uploadVersioned(
          folderId,
          `${baseName}.docx`,
          exports.docx,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      );
    }
    if (exports.html) {
      uploads.push(uploadVersioned(folderId, `${baseName}.html`, exports.html, 'text/html'));
    }
    if (exports.pdf) {
      uploads.push(uploadVersioned(folderId, `${baseName}.pdf`, exports.pdf, 'application/pdf'));
    }
    uploads.push(
      upsertOverwrite(
        folderId,
        `${envelope.productName}.json`,
        JSON.stringify(envelope.contentJson, null, 2),
        'application/json'
      )
    );

    await Promise.all(uploads);

    // Changelog last — should only record a save that actually succeeded.
    await appendChangelog(folderId, envelope.productName, envelope.version, envelope.status, changeSummary, savedBy);

    return { driveFolderId: folderId, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Drive error';
    return { driveFolderId: envelope.driveFolderId ?? '', ok: false, error: message };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/drive/drive-sync.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/drive/drive-sync.ts __tests__/lib/drive/drive-sync.test.ts
git commit -m "feat: add Drive save/export routing with versioned exports and changelog"
```

---

### Task 5: Change-summary diff helper

**Files:**
- Create: `lib/drive/change-summary.ts`
- Test: `__tests__/lib/drive/change-summary.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, two plain objects).
- Produces:
  ```ts
  export function summarizeChanges(
    previous: Record<string, unknown> | null,
    current: Record<string, unknown>
  ): string
  ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/drive/change-summary.test.ts`:

```ts
import { summarizeChanges } from '@/lib/drive/change-summary';

describe('summarizeChanges', () => {
  it('returns "Initial save" when there is no previous version', () => {
    expect(summarizeChanges(null, { a: 1 })).toBe('Initial save');
  });

  it('lists top-level keys whose values changed', () => {
    const previous = { features: ['a'], competitors: [], description: 'x' };
    const current = { features: ['a', 'b'], competitors: [], description: 'x' };
    expect(summarizeChanges(previous, current)).toBe('features updated');
  });

  it('lists multiple changed keys sorted alphabetically, comma separated', () => {
    const previous = { zeta: 1, alpha: 1 };
    const current = { zeta: 2, alpha: 2 };
    expect(summarizeChanges(previous, current)).toBe('alpha, zeta updated');
  });

  it('returns "No content changes" when nothing differs', () => {
    const same = { a: 1, b: 2 };
    expect(summarizeChanges(same, same)).toBe('No content changes');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/drive/change-summary.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/drive/change-summary.ts`**

```ts
export function summarizeChanges(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown>
): string {
  if (!previous) return 'Initial save';

  const changedKeys = Object.keys(current)
    .filter((key) => JSON.stringify(current[key]) !== JSON.stringify(previous[key]))
    .sort();

  if (changedKeys.length === 0) return 'No content changes';
  return `${changedKeys.join(', ')} updated`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/drive/change-summary.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/drive/change-summary.ts __tests__/lib/drive/change-summary.test.ts
git commit -m "feat: add content diff summarizer for Drive changelog entries"
```

---

### Task 6: Rewire One-Pager export route to GCS + Drive

**Files:**
- Modify: `app/api/one-pager/export/route.ts`
- Test: `__tests__/app/api/one-pager/export.test.ts` (create if no existing test covers this route — check first)

**Interfaces:**
- Consumes:
  - `createDocumentEnvelope`, `getDocumentEnvelope`, `saveDocumentEnvelope` from `lib/gcs/documents.ts` (Task 2).
  - `saveDocumentToDrive` from `lib/drive/drive-sync.ts` (Task 4).
  - `summarizeChanges` from `lib/drive/change-summary.ts` (Task 5).
  - Existing `generateOnePagerDocx`, `generateOnePagerHtml` from `lib/one-pager-export.ts` (unchanged).

- [ ] **Step 1: Check for an existing test file**

Run: `ls __tests__/app/api/one-pager/export.test.ts 2>/dev/null || echo "not found"`

If found, read it first and adapt the following steps to extend it rather than replace it. If not found, proceed to Step 2.

- [ ] **Step 2: Write the failing test**

Create `__tests__/app/api/one-pager/export.test.ts`:

```ts
import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

const mockCreateDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  createDocumentEnvelope: (...args: unknown[]) => mockCreateDocumentEnvelope(...args),
}));

const mockSaveDocumentToDrive = jest.fn();
jest.mock('@/lib/drive/drive-sync', () => ({
  saveDocumentToDrive: (...args: unknown[]) => mockSaveDocumentToDrive(...args),
}));

jest.mock('@/lib/drive/change-summary', () => ({
  summarizeChanges: () => 'Initial save',
}));

jest.mock('@/lib/one-pager-export', () => ({
  generateOnePagerDocx: jest.fn().mockResolvedValue(Buffer.from('docx-bytes')),
  generateOnePagerHtml: jest.fn().mockReturnValue('<html></html>'),
}));

import { POST } from '@/app/api/one-pager/export/route';
import { NextRequest } from 'next/server';

describe('POST /api/one-pager/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateDocumentEnvelope.mockResolvedValue({
      id: 'doc-1', toolType: 'one-pager', productName: 'Widget', userId: 'ori@compulocks.com',
      creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft', version: '0.1',
      contentJson: { productName: 'Widget' }, versionHistory: [], driveFolderId: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockSaveDocumentToDrive.mockResolvedValue({ driveFolderId: 'folder-1', ok: true });
  });

  it('creates a GCS envelope and returns the docx export', async () => {
    const req = new NextRequest('http://localhost/api/one-pager/export?format=docx', {
      method: 'POST',
      body: JSON.stringify({ productName: 'Widget' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreateDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ toolType: 'one-pager', productName: 'Widget' })
    );
  });

  it('triggers a best-effort Drive sync without blocking the response', async () => {
    const req = new NextRequest('http://localhost/api/one-pager/export?format=html', {
      method: 'POST',
      body: JSON.stringify({ productName: 'Widget' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Drive sync is fire-and-forget from the route's perspective but should still be invoked.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSaveDocumentToDrive).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- __tests__/app/api/one-pager/export.test.ts`
Expected: FAIL — current route imports `createDocument` from `@/lib/db`, not the new GCS/Drive modules, so the mocked modules are never called and `mockCreateDocumentEnvelope` assertion fails.

- [ ] **Step 4: Rewrite `app/api/one-pager/export/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createDocumentEnvelope } from '@/lib/gcs/documents';
import { saveDocumentToDrive } from '@/lib/drive/drive-sync';
import { summarizeChanges } from '@/lib/drive/change-summary';
import { generateOnePagerDocx, generateOnePagerHtml, type OnePagerData } from '@/lib/one-pager-export';

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const jsonStr = formData.get('__json__');
      if (!jsonStr || typeof jsonStr !== 'string') {
        return NextResponse.json({ error: 'Missing __json__ field' }, { status: 400 });
      }
      body = JSON.parse(jsonStr) as Record<string, unknown>;
    } else {
      body = await request.json();
    }

    const format = new URL(request.url).searchParams.get('format') || 'docx';
    const data: OnePagerData = body as unknown as OnePagerData;
    const title = data.productName || 'Untitled One-Pager';

    let docxBuffer: Buffer | undefined;
    let htmlString: string | undefined;

    if (format === 'html' || format === 'pdf') {
      htmlString = generateOnePagerHtml(data);
    } else {
      docxBuffer = await generateOnePagerDocx(data);
    }

    // Persist to GCS + Drive (fire-and-forget — never blocks the export response).
    auth()
      .then(async (session) => {
        if (!session?.user?.email) return;
        const envelope = await createDocumentEnvelope({
          toolType: 'one-pager',
          productName: title,
          userId: session.user!.email!,
          creatorName: session.user!.name ?? undefined,
          creatorEmail: session.user!.email!,
          contentJson: body,
        });
        await saveDocumentToDrive(
          envelope,
          { docx: docxBuffer, html: htmlString },
          summarizeChanges(null, body),
          session.user!.email!
        );
      })
      .catch((err) => console.error('[export] GCS/Drive persistence failed:', err instanceof Error ? err.message : err));

    if (format === 'html' || format === 'pdf') {
      if (format === 'pdf') {
        return NextResponse.json({ html: htmlString });
      }
      return new NextResponse(htmlString, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="one-pager-${Date.now()}.html"`,
        },
      });
    }

    return new NextResponse(new Uint8Array(docxBuffer!), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="one-pager-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- __tests__/app/api/one-pager/export.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add app/api/one-pager/export/route.ts __tests__/app/api/one-pager/export.test.ts
git commit -m "feat: rewire One-Pager export route to GCS storage and Drive sync"
```

---

### Task 7: Rewire document CRUD routes (`[id]`, versions, rollback, export) to GCS

**Files:**
- Modify: `app/api/documents/[id]/route.ts`
- Modify: `app/api/documents/[id]/export/route.ts`
- Modify: `app/api/documents/[id]/versions/route.ts`
- Modify: `app/api/documents/[id]/rollback/route.ts`
- Test: `__tests__/app/api/documents/id-route.test.ts`

**Interfaces:**
- Consumes: `getDocumentEnvelope`, `saveDocumentEnvelope` from Task 2; `saveDocumentToDrive` from Task 4; `summarizeChanges` from Task 5.

- [ ] **Step 1: Read the three routes being modified in full**

Run:
```bash
cat "app/api/documents/[id]/export/route.ts"
cat "app/api/documents/[id]/versions/route.ts"
cat "app/api/documents/[id]/rollback/route.ts"
```

(These must be read before editing per repo convention — capture their current Postgres-based logic so the GCS rewrite preserves the same request/response contracts for the frontend.)

- [ ] **Step 2: Write the failing test for the PATCH route**

Create `__tests__/app/api/documents/id-route.test.ts`:

```ts
import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

const mockGetDocumentEnvelope = jest.fn();
const mockSaveDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  saveDocumentEnvelope: (...args: unknown[]) => mockSaveDocumentEnvelope(...args),
}));

const mockSaveDocumentToDrive = jest.fn();
jest.mock('@/lib/drive/drive-sync', () => ({
  saveDocumentToDrive: (...args: unknown[]) => mockSaveDocumentToDrive(...args),
}));

jest.mock('@/lib/drive/change-summary', () => ({
  summarizeChanges: () => 'features updated',
}));

import { GET, PATCH, DELETE } from '@/app/api/documents/[id]/route';
import { NextRequest } from 'next/server';

const existingEnvelope = {
  id: 'doc-1', toolType: 'one-pager' as const, productName: 'Widget', userId: 'ori@compulocks.com',
  creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft' as const, version: '0.1',
  contentJson: { foo: 'bar' }, versionHistory: [], driveFolderId: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/documents/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the envelope and isOwner flag', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.isOwner).toBe(true);
  });

  it('returns 404 when the document does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/documents/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
    mockSaveDocumentToDrive.mockResolvedValue({ driveFolderId: 'folder-1', ok: true });
  });

  it('snapshots the previous version into versionHistory before overwriting', async () => {
    const req = new NextRequest('http://localhost/api/documents/doc-1', {
      method: 'PATCH',
      body: JSON.stringify({ contentJson: { foo: 'baz' }, version: '0.2' }),
    });
    await PATCH(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(mockSaveDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '0.2',
        versionHistory: expect.arrayContaining([
          expect.objectContaining({ version: '0.1', contentJson: { foo: 'bar' } }),
        ]),
      })
    );
  });

  it('rejects updates from a non-owner', async () => {
    mockGetDocumentEnvelope.mockResolvedValue({ ...existingEnvelope, userId: 'someone-else@x.com' });
    const req = new NextRequest('http://localhost/api/documents/doc-1', {
      method: 'PATCH',
      body: JSON.stringify({ contentJson: { foo: 'baz' } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('soft-deletes by writing a status/deletedAt marker and returns 204', async () => {
    const res = await DELETE(new NextRequest('http://localhost/api/documents/doc-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(204);
    expect(mockSaveDocumentEnvelope).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- __tests__/app/api/documents/id-route.test.ts`
Expected: FAIL — current route uses `@/lib/db-client` and `@/lib/db`, not the mocked GCS modules.

- [ ] **Step 4: Rewrite `app/api/documents/[id]/route.ts`**

(`DocumentEnvelope` already has `deletedAt: string | null` from Task 2 — no schema change needed here, just soft-delete semantics in the route handlers below.)

```ts
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { saveDocumentToDrive } from '@/lib/drive/drive-sync';
import { summarizeChanges } from '@/lib/drive/change-summary';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await getDocumentEnvelope('one-pager', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    document: doc,
    isOwner: doc.userId === session.user.email,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await getDocumentEnvelope('one-pager', id);
  if (!existing || existing.deletedAt || existing.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }

  const history = [...existing.versionHistory];
  if (existing.contentJson && Object.keys(existing.contentJson).length > 0) {
    history.push({ version: existing.version, savedAt: new Date().toISOString(), contentJson: existing.contentJson });
    if (history.length > 20) history.splice(0, history.length - 20);
  }

  const newVersion = body.version ?? existing.version;
  const updated = await saveDocumentEnvelope({
    ...existing,
    contentJson: body.contentJson,
    version: newVersion,
    versionHistory: history,
  });

  saveDocumentToDrive(
    updated,
    {},
    summarizeChanges(existing.contentJson, updated.contentJson),
    session.user.email
  ).catch((err) => console.error('[documents PATCH] Drive sync failed:', err instanceof Error ? err.message : err));

  return NextResponse.json({ ok: true, document: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getDocumentEnvelope('one-pager', id);
  if (!existing || existing.userId !== session.user.email) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }

  await saveDocumentEnvelope({ ...existing, deletedAt: new Date().toISOString() });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Update `app/api/documents/[id]/export/route.ts`, `versions/route.ts`, `rollback/route.ts`**

Using the content read in Step 1 as a reference for the existing request/response contract, replace each route's Postgres calls (`sql`, `getDocument`, etc.) with `getDocumentEnvelope('one-pager', id)` / `saveDocumentEnvelope(...)` from `@/lib/gcs/documents`, following the same pattern as `route.ts` above:
- `export/route.ts`: replace the `documents` table `SELECT` with `getDocumentEnvelope`, keep the existing `hasFeature(email, 'rd-viewer')` gate and export-format branching unchanged.
- `versions/route.ts`: replace the `SELECT version_history` query with `getDocumentEnvelope(...).versionHistory`.
- `rollback/route.ts`: replace the update-from-snapshot logic with `getDocumentEnvelope` + `saveDocumentEnvelope` using the snapshot's `contentJson`/`version`, preserving the admin-only check already in place.

Do not change the JSON response shapes these routes return — the One-Pager frontend (`OnePagerClient.tsx`, `VersionHistoryPanel.tsx`) consumes them as-is and is out of scope for this plan.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- __tests__/app/api/documents/id-route.test.ts __tests__/lib/gcs/documents.test.ts`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add app/api/documents "lib/gcs/documents.ts" __tests__/app/api/documents/id-route.test.ts __tests__/lib/gcs/documents.test.ts
git commit -m "feat: rewire document CRUD, versions, rollback, export routes to GCS"
```

---

### Task 8: One-time Postgres → GCS migration script for existing One-Pager documents

**Files:**
- Create: `scripts/migrate-documents-to-gcs.ts`
- Test: none (one-off operational script, run manually against production data — not part of the automated test suite, consistent with other scripts under `gcp-migration/`)

**Interfaces:**
- Consumes: `createDocumentEnvelope`... actually needs a variant that preserves the original `id` (not a fresh UUID) — add this to Task 2's module.

- [ ] **Step 1: Add an ID-preserving write function to `lib/gcs/documents.ts`**

Add this export (after `createDocumentEnvelope`):

```ts
export async function writeMigratedEnvelope(envelope: DocumentEnvelope): Promise<void> {
  const bucket = getStorageClient().bucket(getBucketName());
  const file = bucket.file(objectPath(envelope.toolType, envelope.id));
  await file.save(JSON.stringify(envelope), { contentType: 'application/json' });
}
```

- [ ] **Step 2: Write the migration script**

Create `scripts/migrate-documents-to-gcs.ts`:

```ts
/**
 * One-time migration: copies `documents` table rows (tool_type='one-pager')
 * from Postgres into GCS envelopes, preserving id/version/version_history.
 * Run manually: npx tsx scripts/migrate-documents-to-gcs.ts
 * Does not delete Postgres rows — verify GCS output before dropping the table.
 */
import { query } from '@/lib/db-client';
import { writeMigratedEnvelope, type DocumentEnvelope } from '@/lib/gcs/documents';

interface PostgresDocumentRow {
  id: string;
  user_id: string;
  title: string;
  status: 'draft' | 'complete';
  content_json: Record<string, unknown> | null;
  version: string;
  version_history: { version: string; saved_at: string; content_json: Record<string, unknown> }[];
  creator_name: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

async function main() {
  const { rows } = await query<PostgresDocumentRow>(
    `SELECT * FROM documents WHERE tool_type = 'one-pager'`
  );

  console.log(`Found ${rows.length} one-pager documents to migrate.`);

  for (const row of rows) {
    const envelope: DocumentEnvelope = {
      id: row.id,
      toolType: 'one-pager',
      productName: row.title,
      userId: row.user_id,
      creatorName: row.creator_name,
      creatorEmail: row.creator_email,
      status: row.status === 'complete' ? 'published' : 'draft',
      version: row.version,
      contentJson: row.content_json ?? {},
      versionHistory: (row.version_history ?? []).map((h) => ({
        version: h.version,
        savedAt: h.saved_at,
        contentJson: h.content_json,
      })),
      driveFolderId: null,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    await writeMigratedEnvelope(envelope);
    console.log(`Migrated ${row.id} (${row.title})`);
  }

  console.log('Migration complete. Verify GCS objects before dropping the documents table.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Verify the script compiles**

Run: `npx tsc --noEmit scripts/migrate-documents-to-gcs.ts`
Expected: no type errors (may need `--esModuleInterop` / project tsconfig — run `npx tsc --noEmit -p tsconfig.json` instead if the standalone check complains about missing compiler options, since this repo's path alias resolution lives in `tsconfig.json`).

- [ ] **Step 4: Commit**

```bash
git add lib/gcs/documents.ts scripts/migrate-documents-to-gcs.ts
git commit -m "feat: add one-time Postgres to GCS migration script for One-Pager documents"
```

---

### Task 9: Manual end-to-end verification

No code changes — this task verifies Tasks 1-8 work against real GCS/Drive before considering the plan done.

- [ ] **Step 1: Provision a test GCS bucket and set env vars**

Set `GCS_BUCKET_NAME` in `.env.local` to a test bucket (create one in the `r-and-d-489319` GCP project if it doesn't exist — do not point at a name implying production yet).

- [ ] **Step 2: Grant the service account Drive access**

Confirm the service account email in `GOOGLE_SERVICE_ACCOUNT_JSON` has Editor access on both master Drive folders (`1iQvjoIRgRmP8tiUY1pPhT6ecrx_jNftl` and `1vUjZ1yaJCQ_azpAUs56pfAlCgTMqsaNw`) — share the folders with that email via the Drive UI if not already shared.

- [ ] **Step 3: Run the app locally and save a One-Pager**

Run: `npm run dev`
In the browser, fill out a One-Pager with a distinctive product name, click Save/Publish.

- [ ] **Step 4: Verify GCS object**

Run: `gsutil cat gs://<bucket>/one-pager/<id>.json` (get `<id>` from the browser's network tab response) and confirm the envelope shape matches Task 2's interface.

- [ ] **Step 5: Verify Drive folder and files**

Open the One-Pager master folder in a browser, confirm a new subfolder named after the product exists containing: a `.docx`/`.html` export, a `{product}.json` clone, and a `{product} - Changelog.md` with one entry.

- [ ] **Step 6: Save again with a changed field and verify versioning**

Edit the One-Pager (e.g. add a feature), save again. Confirm: a **second** versioned export file appears (old one still present, not overwritten), the `.json` clone is the **same filename** but updated content, and the changelog has a **second appended entry** (not replacing the first).

- [ ] **Step 7: Report results**

If any step fails, do not proceed to the PRD rebuild plan — file the discrepancy against this plan's tasks and fix before moving on.
