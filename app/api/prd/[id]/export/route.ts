import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope } from '@/lib/gcs/documents';
import { generatePRDDocxV2, generatePRDHtmlV2 } from '@/lib/prd-document-generator';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';
import { canAccessComments } from '@/app/api/prd/[id]/comments/route';

/**
 * GET /api/prd/[id]/export?format=docx|html|pdf
 *
 * On-demand export of a saved PRD — available any time, not just at publish.
 * Access mirrors the comments API: commentor, prd-producer, or rd-viewer allowlist flags.
 *
 * format=docx -> binary DOCX download
 * format=html -> binary HTML download
 * format=pdf  -> JSON { html, filename } — client opens a window and calls window.print()
 *                (matches the one-pager / MRD download conventions; PDF is never
 *                server-rendered as a binary in this codebase)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await canAccessComments(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const format = new URL(req.url).searchParams.get('format') || 'docx';
  const content = doc.contentJson as unknown as PRDDocument;
  const filenameBase = `PRD-${(content.productName || 'Document').replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;

  if (format === 'html') {
    const html = generatePRDHtmlV2(content, id);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filenameBase}.html"`,
      },
    });
  }

  if (format === 'pdf') {
    const html = generatePRDHtmlV2(content, id);
    return NextResponse.json({ html, filename: `${filenameBase}.pdf` });
  }

  const buffer = await generatePRDDocxV2(content);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filenameBase}.docx"`,
    },
  });
}
