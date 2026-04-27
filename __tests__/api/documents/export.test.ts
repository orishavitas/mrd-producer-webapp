import { GET } from '@/app/api/documents/[id]/export/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

jest.mock('@/lib/one-pager-export', () => ({
  generateOnePagerHtml: jest.fn().mockReturnValue('<html>test</html>'),
  generateOnePagerDocx: jest.fn().mockResolvedValue(Buffer.from('fake-docx')),
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
  user_id: 'ori@compulocks.com',
  title: 'EMV Bracket',
  tool_type: 'one-pager' as const,
  status: 'complete' as const,
  content_json: fakeContent,
  drive_file_id: null,
  drive_folder: null,
  created_at: '2026-04-23T10:00:00Z',
  updated_at: '2026-04-23T10:00:00Z',
  deleted_at: null,
};

const mockGetDocument = jest.fn().mockResolvedValue(fakeDoc);

jest.mock('@/lib/db', () => ({
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));

describe('GET /api/documents/[id]/export', () => {
  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when document not found', async () => {
    mockGetDocument.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when document belongs to another user', async () => {
    mockGetDocument.mockResolvedValueOnce({ ...fakeDoc, user_id: 'other@compulocks.com' });
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns HTML when format=html', async () => {
    mockGetDocument.mockResolvedValueOnce(fakeDoc);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export?format=html');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
  });

  it('returns DOCX by default', async () => {
    mockGetDocument.mockResolvedValueOnce(fakeDoc);
    const req = new NextRequest('http://localhost/api/documents/doc-1/export');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('wordprocessingml');
  });
});
