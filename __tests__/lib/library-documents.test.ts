import { toLibraryDocument } from '@/lib/db';
import type { DocumentWithCreator } from '@/lib/db';
import { toPRDLibraryDocument } from '@/lib/gcs/documents';
import type { DocumentEnvelope } from '@/lib/gcs/documents';

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

describe('toPRDLibraryDocument (GCS)', () => {
  const draftEnvelope: DocumentEnvelope = {
    id: 'prd-1',
    toolType: 'prd',
    productName: 'EMV PRD v1',
    userId: 'ori@compulocks.com',
    creatorName: 'Ori Shavit',
    creatorEmail: 'ori@compulocks.com',
    status: 'draft',
    version: '0.1',
    contentJson: {},
    versionHistory: [],
    driveFolderId: null,
    deletedAt: null,
    createdAt: '2026-04-23T10:00:00Z',
    updatedAt: '2026-04-23T10:00:00Z',
  };

  it('maps a draft PRD envelope to LibraryDocument', () => {
    const result = toPRDLibraryDocument(draftEnvelope);
    expect(result.id).toBe('prd-1');
    expect(result.toolType).toBe('prd');
    expect(result.title).toBe('EMV PRD v1');
    expect(result.status).toBe('draft');
    expect(result.creatorName).toBe('Ori Shavit');
    expect(result.creatorEmail).toBe('ori@compulocks.com');
    expect(result.editUrl).toBe('/prd/prd-1');
    expect(result.exportBaseUrl).toBe('/api/prd/prd-1/export');
    expect(result.deleteUrl).toBe('/api/prd/prd-1');
    expect(result.deleteMethod).toBe('DELETE');
  });

  it('maps a published PRD envelope status to "complete"', () => {
    const published: DocumentEnvelope = { ...draftEnvelope, status: 'published', version: '1.0' };
    const result = toPRDLibraryDocument(published);
    expect(result.status).toBe('complete');
  });

  it('falls back to null creator fields when the envelope has none', () => {
    const noCreator: DocumentEnvelope = { ...draftEnvelope, creatorName: null, creatorEmail: null };
    const result = toPRDLibraryDocument(noCreator);
    expect(result.creatorName).toBeNull();
    expect(result.creatorEmail).toBeNull();
  });
});
