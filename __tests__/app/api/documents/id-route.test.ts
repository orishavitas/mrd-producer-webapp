import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

const mockGetDocumentEnvelope = jest.fn();
const mockSaveDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  saveDocumentEnvelope: (...args: unknown[]) => mockSaveDocumentEnvelope(...args),
}));

const mockSaveDocumentToDrive = jest.fn();
jest.mock('@/lib/drive/drive-sync', () => ({
  saveDocumentToDrive: (...args: unknown[]) => mockSaveDocumentToDrive(...args),
}));

jest.mock('@/lib/drive/change-summary', () => ({
  summarizeChanges: () => 'features updated',
}));

import { GET, PATCH, DELETE } from '@/app/api/documents/[id]/route';
import { NextRequest } from 'next/server';

const existingEnvelope = {
  id: 'doc-1', toolType: 'one-pager' as const, productName: 'Widget', userId: 'ori@compulocks.com',
  creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft' as const, version: '0.1',
  contentJson: { foo: 'bar' }, versionHistory: [], driveFolderId: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/documents/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the envelope and isOwner flag', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.isOwner).toBe(true);
  });

  it('returns 404 when the document does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/documents/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
    mockSaveDocumentToDrive.mockResolvedValue({ driveFolderId: 'folder-1', ok: true });
  });

  it('snapshots the previous version into versionHistory before overwriting', async () => {
    const req = new NextRequest('http://localhost/api/documents/doc-1', {
      method: 'PATCH',
      body: JSON.stringify({ contentJson: { foo: 'baz' }, version: '0.2' }),
    });
    await PATCH(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(mockSaveDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '0.2',
        versionHistory: expect.arrayContaining([
          expect.objectContaining({ version: '0.1', contentJson: { foo: 'bar' } }),
        ]),
      })
    );
  });

  it('rejects updates from a non-owner', async () => {
    mockGetDocumentEnvelope.mockResolvedValue({ ...existingEnvelope, userId: 'someone-else@x.com' });
    const req = new NextRequest('http://localhost/api/documents/doc-1', {
      method: 'PATCH',
      body: JSON.stringify({ contentJson: { foo: 'baz' } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('soft-deletes by writing a status/deletedAt marker and returns 204', async () => {
    const res = await DELETE(new NextRequest('http://localhost/api/documents/doc-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(204);
    expect(mockSaveDocumentEnvelope).toHaveBeenCalled();
  });
});
