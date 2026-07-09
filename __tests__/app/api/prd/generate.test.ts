import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori Shavit' } }),
}));

const mockGetDocumentEnvelope = jest.fn();
const mockCreateDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  createDocumentEnvelope: (...args: unknown[]) => mockCreateDocumentEnvelope(...args),
}));

const mockExecute = jest.fn();
jest.mock('@/agent/agents/prd/prd-generator-agent', () => ({
  PRDGeneratorAgent: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

jest.mock('@/agent/core/execution-context', () => ({
  createExecutionContext: () => ({ requestId: 'test', config: {}, log: jest.fn(), getProvider: jest.fn(), getFallbackChain: jest.fn(() => []) }),
}));

import { POST } from '@/app/api/prd/generate/route';
import { NextRequest } from 'next/server';

describe('POST /api/prd/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue({
      id: 'op-1', toolType: 'one-pager', productName: 'Widget', userId: 'ori@compulocks.com',
      contentJson: { productName: 'Widget', preparedBy: 'Ori Shavit' }, deletedAt: null,
    });
    mockExecute.mockResolvedValue({
      success: true,
      data: [{ key: 'overview', title: '1. Overview', enabled: true, content: 'Text.' }],
    });
    mockCreateDocumentEnvelope.mockResolvedValue({
      id: 'prd-1', toolType: 'prd', productName: 'Widget', userId: 'ori@compulocks.com',
      contentJson: {}, version: '0.1', status: 'draft', driveFolderId: null, deletedAt: null,
      versionHistory: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('generates a PRD from a One-Pager id and returns the saved envelope', async () => {
    const req = new NextRequest('http://localhost/api/prd/generate', {
      method: 'POST',
      body: JSON.stringify({ onePagerId: 'op-1' }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.document.id).toBe('prd-1');
    expect(mockCreateDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ toolType: 'prd', productName: 'Widget' })
    );
  });

  it('returns 404 when the source One-Pager does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/prd/generate', {
      method: 'POST',
      body: JSON.stringify({ onePagerId: 'missing' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 500 when the generator agent fails', async () => {
    mockExecute.mockResolvedValue({ success: false, error: 'provider down' });
    const req = new NextRequest('http://localhost/api/prd/generate', {
      method: 'POST',
      body: JSON.stringify({ onePagerId: 'op-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
