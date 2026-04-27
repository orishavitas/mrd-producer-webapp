import { jest } from '@jest/globals';
jest.mock('@/lib/db-client');

import { sql } from '@/lib/db-client';
import { createPipelineRun, getPipelineRun, updatePipelineRunStatus, listPRDDocuments } from '@/lib/prd-db';

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

// These tests require a real DB connection — skip in CI
describe.skip('prd-db', () => {
  it('creates a pipeline run', async () => {
    const run = await createPipelineRun('doc-123', 'ori@compulocks.com');
    expect(run.id).toBeTruthy();
    expect(run.status).toBe('running');
    expect(run.source_document_id).toBe('doc-123');
  });

  it('fetches a pipeline run by id', async () => {
    const run = await createPipelineRun('doc-456', 'ori@compulocks.com');
    const fetched = await getPipelineRun(run.id);
    expect(fetched?.id).toBe(run.id);
  });

  it('updates pipeline run status', async () => {
    const run = await createPipelineRun('doc-789', 'ori@compulocks.com');
    const updated = await updatePipelineRunStatus(run.id, 'awaiting_approval');
    expect(updated.status).toBe('awaiting_approval');
  });
});
