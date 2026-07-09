import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

const mockGetDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
}));

const mockHasFeature = jest.fn();
jest.mock('@/lib/feature-gate', () => ({
  hasFeature: (...args: unknown[]) => mockHasFeature(...args),
}));

jest.mock('@/lib/one-pager-export', () => ({
  generateOnePagerDocx: jest.fn().mockResolvedValue(Buffer.from('docx-bytes')),
  generateOnePagerHtml: jest.fn().mockReturnValue('<html>preview</html>'),
}));

import { GET } from '@/app/api/documents/[id]/export/route';
import { NextRequest } from 'next/server';

const existingEnvelope = {
  id: 'doc-1', toolType: 'one-pager' as const, productName: 'Widget', userId: 'ori@compulocks.com',
  creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft' as const, version: '0.1',
  contentJson: { foo: 'bar' }, versionHistory: [], driveFolderId: null, deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/documents/[id]/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasFeature.mockResolvedValue(false);
  });

  it('returns 404 when the document does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/documents/missing/export'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('allows the owner to export as docx by default', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/export'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('wordprocessingml');
    expect(res.headers.get('Content-Disposition')).toContain('Widget.docx');
  });

  it('returns html when format=html is requested', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(existingEnvelope);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/export?format=html'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html');
  });

  it('forbids a non-owner without the rd-viewer feature', async () => {
    mockGetDocumentEnvelope.mockResolvedValue({ ...existingEnvelope, userId: 'someone-else@x.com' });
    mockHasFeature.mockResolvedValue(false);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/export'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('allows a non-owner with the rd-viewer feature', async () => {
    mockGetDocumentEnvelope.mockResolvedValue({ ...existingEnvelope, userId: 'someone-else@x.com' });
    mockHasFeature.mockResolvedValue(true);
    const res = await GET(new NextRequest('http://localhost/api/documents/doc-1/export'), {
      params: Promise.resolve({ id: 'doc-1' }),
    });
    expect(res.status).toBe(200);
  });
});
