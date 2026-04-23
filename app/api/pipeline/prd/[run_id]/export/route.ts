/**
 * PRD Export API
 *
 * GET /api/pipeline/prd/[run_id]/export?format=docx|html
 *
 * Exports a completed PRD document in DOCX or HTML format.
 * Requires authenticated user to be the document creator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPRDDocument, getPRDFrames } from '@/lib/prd-db';
import { generatePRDDocx, generatePRDHtml } from '@/lib/prd-document-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { run_id } = await params;
  const format = req.nextUrl.searchParams.get('format') ?? 'docx';

  // Get PRD document by prd_documents.id (URL segment is now the prd_document_id)
  const prdDoc = await getPRDDocument(run_id);
  if (!prdDoc) {
    return NextResponse.json({ error: 'PRD not found' }, { status: 404 });
  }

  // Verify ownership
  if (prdDoc.created_by !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get PRD frames
  const frames = await getPRDFrames(prdDoc.id);
  if (frames.length === 0) {
    return NextResponse.json(
      { error: 'No PRD content found' },
      { status: 400 }
    );
  }

  const preparedBy = session.user.email;
  const sanitizedProductName = prdDoc.product_name.replace(/[^\w\s-]/g, '');

  try {
    if (format === 'html') {
      const html = generatePRDHtml(frames, prdDoc.product_name, preparedBy);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${sanitizedProductName}-PRD.html"`,
        },
      });
    }

    // Default to DOCX
    const buffer = await generatePRDDocx(frames, prdDoc.product_name, preparedBy);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${sanitizedProductName}-PRD.docx"`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PRD Export] Error:', {
      run_id,
      format,
      error: errorMessage,
    });
    return NextResponse.json(
      { error: 'Failed to export PRD' },
      { status: 500 }
    );
  }
}
