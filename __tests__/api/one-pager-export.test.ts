import { POST } from '@/app/api/one-pager/export/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/db', () => ({
  createDocument: jest.fn(),
}));

jest.mock('@/lib/one-pager-export', () => ({
  generateOnePagerHtml: jest.fn((data) => `<html>${data.productName}</html>`),
  generateOnePagerDocx: jest.fn().mockResolvedValue(Buffer.from('docx')),
}));

describe('POST /api/one-pager/export', () => {
  it('accepts form-encoded preview state from new-tab preview', async () => {
    const body = new URLSearchParams();
    body.set('__json__', JSON.stringify({ productName: 'Preview Bracket' }));

    const req = new NextRequest('http://localhost/api/one-pager/export?format=html', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    await expect(res.text()).resolves.toContain('Preview Bracket');
  });
});
