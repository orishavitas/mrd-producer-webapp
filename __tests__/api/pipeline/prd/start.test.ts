import { POST } from '@/app/api/pipeline/prd/start/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', id: 'user-1' } }),
}));

jest.mock('@/lib/db', () => ({
  getDocument: jest.fn().mockResolvedValue({
    id: 'doc-1',
    tool_type: 'one-pager',
    content_json: { productName: 'Test Product', description: 'A product' },
  }),
}));

jest.mock('@/lib/prd-db', () => ({
  createPipelineRun: jest.fn().mockResolvedValue({ id: 'run-1', status: 'running' }),
  updatePipelineRunStatus: jest.fn().mockResolvedValue({}),
  getPipelineRun: jest.fn().mockResolvedValue(null),
  savePRDFrames: jest.fn().mockResolvedValue(undefined),
  createPRDDocument: jest.fn().mockResolvedValue({ id: 'prd-1' }),
}));

jest.mock('@/agent/agents/prd/one-pager-analyst-agent', () => ({
  OnePagerAnalystAgent: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      data: { productName: 'Test Product' },
    }),
  })),
}));

jest.mock('@/agent/agents/prd/prd-architect-agent', () => ({
  PRDArchitectAgent: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      data: [{ sectionKey: 'overview', sectionTitle: '1. Overview' }],
    }),
  })),
}));

jest.mock('@/agent/agents/prd/prd-writer-agent', () => ({
  PRDWriterAgent: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      data: [{ sectionKey: 'overview', sectionOrder: 1, content: 'Overview content' }],
    }),
  })),
}));

jest.mock('@/agent/agents/prd/prd-qa-agent', () => ({
  PRDQAAgent: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      data: { score: 95, suggestions: [] },
    }),
  })),
}));

jest.mock('@/agent/core/execution-context', () => ({
  createExecutionContext: jest.fn().mockReturnValue({
    requestId: 'test-request',
    log: jest.fn(),
    getProvider: jest.fn(),
  }),
}));

describe('POST /api/pipeline/prd/start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/pipeline/prd/start', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when documentId is missing', async () => {
    const req = new NextRequest('http://localhost/api/pipeline/prd/start', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when document not found or wrong type', async () => {
    const { getDocument } = require('@/lib/db');
    getDocument.mockResolvedValueOnce({ id: 'doc-1', tool_type: 'mrd', content_json: {} });

    const req = new NextRequest('http://localhost/api/pipeline/prd/start', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
