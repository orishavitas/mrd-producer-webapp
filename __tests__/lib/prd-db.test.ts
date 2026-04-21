import { createPipelineRun, getPipelineRun, updatePipelineRunStatus } from '@/lib/prd-db';

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
