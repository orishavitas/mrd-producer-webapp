import { randomUUID } from 'crypto';
import { getStorageClient } from '@/lib/gcs/gcs-client';
import type { LibraryDocument } from '@/lib/db';

function getBucketName(): string {
  const name = process.env.GCS_BUCKET_NAME;
  if (!name) throw new Error('GCS_BUCKET_NAME not set');
  return name;
}

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

/**
 * Writes an envelope to GCS preserving its existing `id` (unlike
 * `createDocumentEnvelope`, which always mints a fresh UUID). Used by the
 * one-time Postgres -> GCS migration script so migrated documents keep the
 * same id/links they had in Postgres.
 */
export async function writeMigratedEnvelope(envelope: DocumentEnvelope): Promise<void> {
  const bucket = getStorageClient().bucket(getBucketName());
  const file = bucket.file(objectPath(envelope.toolType, envelope.id));
  await file.save(JSON.stringify(envelope), { contentType: 'application/json' });
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

/**
 * Maps a GCS `DocumentEnvelope` (toolType='prd') to the dashboard's
 * `LibraryDocument` shape (see `lib/db.ts`). Replaces the old
 * `toPRDLibraryDocument` in `lib/db.ts`, which read from the now-deleted
 * Postgres `prd_documents` table — PRD documents live in GCS now, alongside
 * One-Pager documents, both behind the same `DocumentEnvelope` type.
 *
 * `status: 'draft'` maps to `'draft'` and `'published'` maps to `'complete'`
 * to match `LibraryDocument['status']`, which predates the GCS envelope's
 * own draft/published vocabulary.
 */
export function toPRDLibraryDocument(doc: DocumentEnvelope): LibraryDocument {
  return {
    id: doc.id,
    title: doc.productName,
    toolType: 'prd',
    status: doc.status === 'published' ? 'complete' : 'draft',
    creatorName: doc.creatorName,
    creatorEmail: doc.creatorEmail,
    updatedAt: doc.updatedAt,
    editUrl: `/prd/${doc.id}`,
    exportBaseUrl: `/api/prd/${doc.id}/export`,
    deleteUrl: `/api/prd/${doc.id}`,
    deleteMethod: 'DELETE',
  };
}
