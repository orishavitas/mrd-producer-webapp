import { toLibraryDocument, toPRDLibraryDocument } from '@/lib/db';
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
