import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'reviewer@compulocks.com', name: 'Reviewer' } }),
}));

const mockHasFeature = jest.fn();
jest.mock('@/lib/feature-gate', () => ({
  hasFeature: (...args: unknown[]) => mockHasFeature(...args),
}));

const mockGetDocumentEnvelope = jest.fn();
const mockSaveDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  saveDocumentEnvelope: (...args: unknown[]) => mockSaveDocumentEnvelope(...args),
}));

import { GET, POST } from '@/app/api/prd/[id]/comments/route';
import { PATCH } from '@/app/api/prd/[id]/comments/[commentId]/route';
import { NextRequest } from 'next/server';

const envelopeWithComments = {
  id: 'prd-1', toolType: 'prd' as const, productName: 'Widget', userId: 'owner@compulocks.com',
  status: 'draft' as const, version: '0.1', deletedAt: null, driveFolderId: null, versionHistory: [],
  contentJson: {
    sourceOnePagerId: 'op-1', productName: 'Widget', preparedBy: 'Owner',
    version: '0.1', status: 'draft', sections: [],
    comments: [{ id: 'c1', sectionKey: 'overview', author: 'owner@compulocks.com', body: 'Looks good', createdAt: '2026-01-01T00:00:00.000Z', resolved: false }],
  },
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/prd/[id]/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasFeature.mockResolvedValue(true);
    mockGetDocumentEnvelope.mockResolvedValue(envelopeWithComments);
  });

  it('returns comments for an allowlisted commentor even if not the owner', async () => {
    const res = await GET(new NextRequest('http://localhost/api/prd/prd-1/comments'), { params: Promise.resolve({ id: 'prd-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.comments).toHaveLength(1);
  });

  it('returns 403 when the user has neither commentor nor prd-producer nor rd-viewer', async () => {
    mockHasFeature.mockResolvedValue(false);
    const res = await GET(new NextRequest('http://localhost/api/prd/prd-1/comments'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/prd/[id]/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasFeature.mockResolvedValue(true);
    mockGetDocumentEnvelope.mockResolvedValue(envelopeWithComments);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('appends a new comment and persists it', async () => {
    const req = new NextRequest('http://localhost/api/prd/prd-1/comments', {
      method: 'POST',
      body: JSON.stringify({ sectionKey: 'goals', body: 'Needs more detail' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'prd-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.comments).toHaveLength(2);
    expect(mockSaveDocumentEnvelope).toHaveBeenCalled();
  });
});

describe('PATCH /api/prd/[id]/comments/[commentId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasFeature.mockResolvedValue(true);
    mockGetDocumentEnvelope.mockResolvedValue(envelopeWithComments);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('lets the comment author resolve their own comment', async () => {
    const authoredEnvelope = {
      ...envelopeWithComments,
      contentJson: {
        ...envelopeWithComments.contentJson,
        comments: [{ ...envelopeWithComments.contentJson.comments[0], author: 'reviewer@compulocks.com' }],
      },
    };
    mockGetDocumentEnvelope.mockResolvedValue(authoredEnvelope);
    const req = new NextRequest('http://localhost/api/prd/prd-1/comments/c1', {
      method: 'PATCH',
      body: JSON.stringify({ resolved: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'prd-1', commentId: 'c1' }) });
    expect(res.status).toBe(200);
  });

  it('rejects resolving someone else\'s comment when not the document owner', async () => {
    const req = new NextRequest('http://localhost/api/prd/prd-1/comments/c1', {
      method: 'PATCH',
      body: JSON.stringify({ resolved: true }),
    });
    // envelopeWithComments: owner is 'owner@compulocks.com', comment author is 'owner@compulocks.com',
    // requester is 'reviewer@compulocks.com' (neither author nor owner) — should be rejected.
    const res = await PATCH(req, { params: Promise.resolve({ id: 'prd-1', commentId: 'c1' }) });
    expect(res.status).toBe(403);
  });

  it('lets the document owner resolve someone else\'s comment even when not the author', async () => {
    // Session user (mocked at module level, see top of file) is 'reviewer@compulocks.com'.
    // Here doc.userId is set to that same email (the requester IS the document owner),
    // while the target comment's author is a different email ('owner@compulocks.com').
    // This exercises the isDocOwner branch of the `isAuthor || isDocOwner` check
    // specifically — the OR branch not covered by the two tests above.
    const ownerNotAuthorEnvelope = {
      ...envelopeWithComments,
      userId: 'reviewer@compulocks.com',
      contentJson: {
        ...envelopeWithComments.contentJson,
        comments: [{ ...envelopeWithComments.contentJson.comments[0], author: 'owner@compulocks.com' }],
      },
    };
    mockGetDocumentEnvelope.mockResolvedValue(ownerNotAuthorEnvelope);
    const req = new NextRequest('http://localhost/api/prd/prd-1/comments/c1', {
      method: 'PATCH',
      body: JSON.stringify({ resolved: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'prd-1', commentId: 'c1' }) });
    expect(res.status).toBe(200);
  });
});
