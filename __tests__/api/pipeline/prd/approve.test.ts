import { POST as POST_APPROVE } from '@/app/api/pipeline/prd/[run_id]/approve/route';
import { GET as GET_STATUS } from '@/app/api/pipeline/prd/[run_id]/status/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com' } }),
}));

jest.mock('@/lib/prd-db', () => ({
  getPipelineRun: jest.fn().mockResolvedValue({
    id: 'run-1',
    status: 'awaiting_approval',
    skeleton_json: [],
    created_by: 'ori@compulocks.com',
  }),
  updatePipelineRunStatus: jest.fn().mockResolvedValue({
    id: 'run-1',
    status: 'approved',
  }),
}));

describe('POST /api/pipeline/prd/[run_id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/pipeline/prd/run-1/approve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST_APPROVE(req, {
      params: Promise.resolve({ run_id: 'run-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when run not found', async () => {
    const { getPipelineRun } = require('@/lib/prd-db');
    getPipelineRun.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/pipeline/prd/run-1/approve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST_APPROVE(req, {
      params: Promise.resolve({ run_id: 'run-1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when run is not awaiting approval', async () => {
    const { getPipelineRun } = require('@/lib/prd-db');
    getPipelineRun.mockResolvedValueOnce({ id: 'run-1', status: 'completed', skeleton_json: [], created_by: 'ori@compulocks.com' });
    const req = new NextRequest('http://localhost/api/pipeline/prd/run-1/approve', {
      method: 'POST', body: JSON.stringify({})
    });
    const res = await POST_APPROVE(req, { params: Promise.resolve({ run_id: 'run-1' }) });
    expect(res.status).toBe(409);
  });

  it('returns 200 and marks run approved', async () => {
    const req = new NextRequest('http://localhost/api/pipeline/prd/run-1/approve', {
      method: 'POST',
      body: JSON.stringify({
        skeleton: [
          {
            sectionKey: 'overview',
            sectionTitle: '1. Overview',
            strategy: 'ok',
            writingDirective: 'write it',
          },
        ],
      }),
    });

    const res = await POST_APPROVE(req, {
      params: Promise.resolve({ run_id: 'run-1' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('approved');
  });
});

describe('GET /api/pipeline/prd/[run_id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/pipeline/prd/run-1/status');
    const res = await GET_STATUS(req, {
      params: Promise.resolve({ run_id: 'run-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when run not found', async () => {
    const { getPipelineRun } = require('@/lib/prd-db');
    getPipelineRun.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/pipeline/prd/run-1/status');
    const res = await GET_STATUS(req, {
      params: Promise.resolve({ run_id: 'run-1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with run status and skeleton', async () => {
    const req = new NextRequest('http://localhost/api/pipeline/prd/run-1/status');
    const res = await GET_STATUS(req, {
      params: Promise.resolve({ run_id: 'run-1' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('awaiting_approval');
    expect(Array.isArray(data.skeleton)).toBe(true);
  });
});
