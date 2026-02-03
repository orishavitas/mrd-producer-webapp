import { NextRequest, NextResponse } from 'next/server';
import { generateDocx, generateHtml } from '@/lib/document-generator';

/**
 * POST /api/download
 *
 * Converts MRD markdown to downloadable document format.
 *
 * Request body:
 * - markdown: string (required) - The MRD content in markdown
 * - format: 'docx' | 'pdf' | 'html' (required) - Output format
 * - productName?: string - Product name for document header
 *
 * Response:
 * - Binary file download (DOCX, PDF, or HTML)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdown, format, productName } = body;

    if (!markdown) {
      return NextResponse.json(
        { error: 'Markdown content is required' },
        { status: 400 }
      );
    }

    if (!format || !['docx', 'pdf', 'html'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be one of: docx, pdf, html' },
        { status: 400 }
      );
    }

    const filename = `MRD-${productName?.replace(/[^a-zA-Z0-9]/g, '-') || 'Document'}-${Date.now()}`;

    if (format === 'docx') {
      console.log('[Download] Generating DOCX document');
      const buffer = await generateDocx(markdown, productName);

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}.docx"`,
        },
      });
    }

    if (format === 'html') {
      console.log('[Download] Generating HTML document');
      const html = generateHtml(markdown, productName);

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.html"`,
        },
      });
    }

    if (format === 'pdf') {
      // For PDF, we return HTML that can be printed to PDF
      // Client-side will handle the PDF conversion using browser print
      console.log('[Download] Generating PDF-ready HTML');
      const html = generateHtml(markdown, productName);

      return NextResponse.json({
        html,
        filename: `${filename}.pdf`,
        message: 'Use browser print to save as PDF',
      });
    }

    return NextResponse.json(
      { error: 'Unsupported format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Download] Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
