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
  summarizeChanges: () => 'sections updated',
}));

import { GET, PATCH } from '@/app/api/prd/[id]/route';
import { POST as publishPOST } from '@/app/api/prd/[id]/publish/route';
import { NextRequest } from 'next/server';

const existingPrdEnvelope = {
  id: 'prd-1', toolType: 'prd' as const, productName: 'Widget', userId: 'ori@compulocks.com',
  creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft' as const, version: '0.1',
  contentJson: {
    sourceOnePagerId: 'op-1', productName: 'Widget', preparedBy: 'Ori',
    version: '0.1', status: 'draft', sections: [{ key: 'overview', title: '1. Overview', enabled: true, content: 'Old text.' }],
    comments: [],
  },
  versionHistory: [], driveFolderId: null, deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/prd/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the PRD envelope', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(existingPrdEnvelope);
    const res = await GET(new NextRequest('http://localhost/api/prd/prd-1'), { params: Promise.resolve({ id: 'prd-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.document.contentJson.productName).toBe('Widget');
  });
});

describe('PATCH /api/prd/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingPrdEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
    mockSaveDocumentToDrive.mockResolvedValue({ driveFolderId: 'folder-1', ok: true });
  });

  it('saves section edits and snapshots the previous version', async () => {
    const newSections = [{ key: 'overview', title: '1. Overview', enabled: true, content: 'New text.' }];
    const req = new NextRequest('http://localhost/api/prd/prd-1', {
      method: 'PATCH',
      body: JSON.stringify({ sections: newSections, version: '0.2' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(200);
    expect(mockSaveDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        versionHistory: expect.arrayContaining([expect.objectContaining({ version: '0.1' })]),
      })
    );
  });
});

describe('POST /api/prd/[id]/publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingPrdEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
    mockSaveDocumentToDrive.mockResolvedValue({ driveFolderId: 'folder-1', ok: true });
  });

  it('bumps to the next major version and triggers a Drive sync', async () => {
    const res = await publishPOST(new NextRequest('http://localhost/api/prd/prd-1/publish', { method: 'POST' }), {
      params: Promise.resolve({ id: 'prd-1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.document.version).toBe('1.0');
    expect(mockSaveDocumentToDrive).toHaveBeenCalled();
  });
});
