import { DELETE } from '@/app/api/pipeline/prd/[run_id]/delete/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com' } }),
}));

const fakeDoc = {
  id: 'prd-1', run_id: 'run-1', source_document_id: 'doc-1',
  product_name: 'Test PRD', qa_score: null, qa_suggestions: [],
  created_by: 'ori@compulocks.com',
  created_at: '2026-04-23T10:00:00Z', updated_at: '2026-04-23T10:00:00Z',
};

const mockGetPRDDocument = jest.fn().mockResolvedValue(fakeDoc);
const mockSoftDelete = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/prd-db', () => ({
  getPRDDocument: (...args: unknown[]) => mockGetPRDDocument(...args),
  softDeletePRDDocument: (...args: unknown[]) => mockSoftDelete(...args),
}));

describe('DELETE /api/pipeline/prd/[prd_id]/delete', () => {
  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ run_id: 'prd-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when PRD not found', async () => {
    mockGetPRDDocument.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ run_id: 'prd-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when PRD belongs to another user', async () => {
    mockGetPRDDocument.mockResolvedValueOnce({ ...fakeDoc, created_by: 'other@compulocks.com' });
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ run_id: 'prd-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful delete', async () => {
    mockGetPRDDocument.mockResolvedValueOnce(fakeDoc);
    const req = new NextRequest('http://localhost/api/pipeline/prd/prd-1/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ run_id: 'prd-1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
