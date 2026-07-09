import { GET } from '@/app/api/documents/[id]/export/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

jest.mock('@/lib/one-pager-export', () => ({
  generateOnePagerHtml: jest.fn().mockReturnValue('<html>test</html>'),
  generateOnePagerDocx: jest.fn().mockResolvedValue(Buffer.from('fake-docx')),
}));

const mockHasFeature = jest.fn().mockResolvedValue(false);
jest.mock('@/lib/feature-gate', () => ({
  hasFeature: (...args: unknown[]) => mockHasFeature(...args),
}));

const fakeContent = {
  description: 'A bracket',
  goal: 'Secure devices',
  useCases: '',
  context: { environments: [], industries: [] },
  audience: { predefined: [], custom: [] },
  features: { mustHave: [], niceToHave: [] },
  commercials: { moq: '', targetPrice: '' },
  competitors: [],
  productName: 'EMV Bracket',
};

const fakeDoc = {
  id: 'doc-1',
  toolType: 'one-pager' as const,
  productName: 'EMV Bracket',
  userId: 'ori@compulocks.com',
  creatorName: 'Ori',
  creatorEmail: 'ori@compulocks.com',
  status: 'draft' as const,
  version: '0.1',
  contentJson: fakeContent,
  versionHistory: [],
  driveFolderId: null,
  deletedAt: null,
  createdAt: '2026-04-23T10:00:00Z',
  updatedAt: '2026-04-23T10:00:00Z',
};

const mockGetDocumentEnvelope = jest.fn().mockResolvedValue(fakeDoc);

jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
}));

describe('GET /api/documents/[id]/export', () => {
  beforeEach(() => {
    mockGetDocumentEnvelope.mockClear();
    mockHasFeature.mockClear();
    mockHasFeature.mockResolvedValue(false);
    mockGetDocumentEnvelope.mockResolvedValue(fakeDoc);
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when document not found', async () => {
    mockGetDocumentEnvelope.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when document is soft-deleted', async () => {
    mockGetDocumentEnvelope.mockResolvedValueOnce({ ...fakeDoc, deletedAt: '2026-05-01T00:00:00Z' });
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when document belongs to another user and requester lacks rd-viewer', async () => {
    mockGetDocumentEnvelope.mockResolvedValueOnce({ ...fakeDoc, userId: 'other@compulocks.com' });
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(403);
  });

  it('allows access when document belongs to another user but requester has rd-viewer', async () => {
    mockHasFeature.mockResolvedValueOnce(true);
    mockGetDocumentEnvelope.mockResolvedValueOnce({ ...fakeDoc, userId: 'other@compulocks.com' });
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(200);
  });

  it('returns HTML when format=html', async () => {
    mockGetDocumentEnvelope.mockResolvedValueOnce(fakeDoc);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
  });

  it('returns DOCX by default', async () => {
    mockGetDocumentEnvelope.mockResolvedValueOnce(fakeDoc);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('wordprocessingml');
  });
});
