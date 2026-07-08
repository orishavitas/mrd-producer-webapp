import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

const mockCreateDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  createDocumentEnvelope: (...args: unknown[]) => mockCreateDocumentEnvelope(...args),
}));

const mockSaveDocumentToDrive = jest.fn();
jest.mock('@/lib/drive/drive-sync', () => ({
  saveDocumentToDrive: (...args: unknown[]) => mockSaveDocumentToDrive(...args),
}));

jest.mock('@/lib/drive/change-summary', () => ({
  summarizeChanges: () => 'Initial save',
}));

jest.mock('@/lib/one-pager-export', () => ({
  generateOnePagerDocx: jest.fn().mockResolvedValue(Buffer.from('docx-bytes')),
  generateOnePagerHtml: jest.fn().mockReturnValue('<html></html>'),
}));

import { POST } from '@/app/api/one-pager/export/route';
import { NextRequest } from 'next/server';

describe('POST /api/one-pager/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateDocumentEnvelope.mockResolvedValue({
      id: 'doc-1', toolType: 'one-pager', productName: 'Widget', userId: 'ori@compulocks.com',
      creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft', version: '0.1',
      contentJson: { productName: 'Widget' }, versionHistory: [], driveFolderId: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockSaveDocumentToDrive.mockResolvedValue({ driveFolderId: 'folder-1', ok: true });
  });

  it('creates a GCS envelope and returns the docx export', async () => {
    const req = new NextRequest('http://localhost/api/one-pager/export?format=docx', {
      method: 'POST',
      body: JSON.stringify({ productName: 'Widget' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreateDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ toolType: 'one-pager', productName: 'Widget' })
    );
  });

  it('triggers a best-effort Drive sync without blocking the response', async () => {
    const req = new NextRequest('http://localhost/api/one-pager/export?format=html', {
      method: 'POST',
      body: JSON.stringify({ productName: 'Widget' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Drive sync is fire-and-forget from the route's perspective but should still be invoked.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSaveDocumentToDrive).toHaveBeenCalled();
  });
});
