import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

jest.mock('@/lib/admin', () => ({
  isAdmin: (email: string | null | undefined) => email === 'ori@compulocks.com',
}));

const mockGetDocumentEnvelope = jest.fn();
const mockSaveDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  saveDocumentEnvelope: (...args: unknown[]) => mockSaveDocumentEnvelope(...args),
}));

import { POST } from '@/app/api/documents/[id]/rollback/route';
import { NextRequest } from 'next/server';

const existingEnvelope = {
  id: 'doc-1', toolType: 'one-pager' as const, productName: 'Widget', userId: 'someone@compulocks.com',
  creatorName: 'Someone', creatorEmail: 'someone@compulocks.com', status: 'draft' as const, version: '0.2',
  contentJson: { foo: 'new' },
  versionHistory: [
    { version: '0.1', savedAt: '2026-01-01T00:00:00.000Z', contentJson: { foo: 'old' } },
  ],
  driveFolderId: null, deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/documents/doc-1/rollback', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/documents/[id]/rollback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ version: '0.1' }), { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when requester is not an admin', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce({ user: { email: 'other@compulocks.com', name: 'Other' } });
    const res = await POST(makeReq({ version: '0.1' }), { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the document does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const res = await POST(makeReq({ version: '0.1' }), { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the requested version snapshot is missing', async () => {
    const res = await POST(makeReq({ version: '9.9' }), { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });

  it('restores the snapshot contentJson/version and saves the envelope', async () => {
    const res = await POST(makeReq({ version: '0.1' }), { params: Promise.resolve({ id: 'doc-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockSaveDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ version: '0.1', contentJson: { foo: 'old' } })
    );
    expect(json.document.version).toBe('0.1');
  });
});
