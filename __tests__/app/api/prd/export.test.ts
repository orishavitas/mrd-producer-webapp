import { jest } from '@jest/globals';

const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

const mockHasFeature = jest.fn();
jest.mock('@/lib/feature-gate', () => ({
  hasFeature: (...args: unknown[]) => mockHasFeature(...args),
}));

const mockGetDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
}));

const mockGeneratePRDDocxV2 = jest.fn();
const mockGeneratePRDHtmlV2 = jest.fn();
jest.mock('@/lib/prd-document-generator', () => ({
  generatePRDDocxV2: (...args: unknown[]) => mockGeneratePRDDocxV2(...args),
  generatePRDHtmlV2: (...args: unknown[]) => mockGeneratePRDHtmlV2(...args),
}));

import { GET } from '@/app/api/prd/[id]/export/route';
import { NextRequest } from 'next/server';

const existingPrdEnvelope = {
  id: 'prd-1',
  toolType: 'prd' as const,
  productName: 'Widget',
  userId: 'owner@compulocks.com',
  creatorName: 'Owner',
  creatorEmail: 'owner@compulocks.com',
  status: 'draft' as const,
  version: '0.1',
  contentJson: {
    sourceOnePagerId: 'op-1',
    productName: 'Widget',
    preparedBy: 'Owner',
    version: '0.1',
    status: 'draft',
    sections: [{ key: 'overview', title: '1. Overview', enabled: true, content: 'Some text.' }],
    comments: [],
  },
  versionHistory: [],
  driveFolderId: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeRequest(format?: string) {
  const url = format
    ? `http://localhost/api/prd/prd-1/export?format=${format}`
    : 'http://localhost/api/prd/prd-1/export';
  return new NextRequest(url);
}

describe('GET /api/prd/[id]/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { email: 'reviewer@compulocks.com', name: 'Reviewer' } });
    mockHasFeature.mockResolvedValue(true);
    mockGetDocumentEnvelope.mockResolvedValue(existingPrdEnvelope);
    mockGeneratePRDDocxV2.mockResolvedValue(Buffer.from('fake-docx-bytes'));
    mockGeneratePRDHtmlV2.mockReturnValue('<html><body>PRD</body></html>');
  });

  it('returns a binary DOCX download with the correct content-type', async () => {
    const res = await GET(makeRequest('docx'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(mockGeneratePRDDocxV2).toHaveBeenCalledWith(existingPrdEnvelope.contentJson);
  });

  it('defaults to docx when no format is specified', async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('returns a downloadable HTML file for format=html', async () => {
    const res = await GET(makeRequest('html'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const body = await res.text();
    expect(body).toContain('PRD');
  });

  it('returns JSON with html and filename for format=pdf (never a binary response)', async () => {
    const res = await GET(makeRequest('pdf'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const json = await res.json();
    expect(json.html).toContain('PRD');
    expect(json.filename).toMatch(/\.pdf$/);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest('docx'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when the user has neither commentor nor prd-producer nor rd-viewer', async () => {
    mockHasFeature.mockResolvedValue(false);
    const res = await GET(makeRequest('docx'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the document does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const res = await GET(makeRequest('docx'), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the document is soft-deleted', async () => {
    mockGetDocumentEnvelope.mockResolvedValue({ ...existingPrdEnvelope, deletedAt: '2026-01-02T00:00:00.000Z' });
    const res = await GET(makeRequest('docx'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(404);
  });
});
