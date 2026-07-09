import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

jest.mock('@/lib/admin', () => ({
  isAdmin: (email: string | null | undefined) => email === 'ori@compulocks.com',
}));

const mockGetDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
}));

import { GET } from '@/app/api/documents/[id]/versions/route';
import { NextRequest } from 'next/server';

const existingEnvelope = {
  id: 'doc-1', toolType: 'one-pager' as const, productName: 'Widget', userId: 'ori@compulocks.com',
  creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft' as const, version: '0.2',
  contentJson: { foo: 'bar' },
  versionHistory: [
    { version: '0.1', savedAt: '2026-01-01T00:00:00.000Z', contentJson: { foo: 'old' } },
  ],
  driveFolderId: null, deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/documents/[id]/versions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/versions'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when requester is not an admin', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce({ user: { email: 'other@compulocks.com', name: 'Other' } });
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/versions'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the document does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/documents/missing/versions'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the document is soft-deleted', async () => {
    mockGetDocumentEnvelope.mockResolvedValue({ ...existingEnvelope, deletedAt: '2026-05-01T00:00:00Z' });
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/versions'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns version and history', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/versions'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.version).toBe('0.2');
    expect(json.history).toEqual(existingEnvelope.versionHistory);
  });
});
