import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createDocument } from '@/lib/db';
import { generateOnePagerDocx, generateOnePagerHtml, type OnePagerData } from '@/lib/one-pager-export';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const format = new URL(request.url).searchParams.get('format') || 'docx';
    const data: OnePagerData = body;

    // Save to documents table (fire-and-forget — never blocks the export response)
    auth().then((session) => {
      if (session?.user?.email) {
        const title = data.productName || 'Untitled One-Pager';
        createDocument(session.user.email, title, 'one-pager', body as Record<string, unknown>, session.user.name ?? undefined, session.user.email).catch(
          (err) => console.error('[export] createDocument failed:', err instanceof Error ? err.message : err)
        );
      }
    }).catch(() => { /* auth unavailable — skip */ });

    if (format === 'html' || format === 'pdf') {
      const html = generateOnePagerHtml(data);
      if (format === 'pdf') {
        return NextResponse.json({ html });
      }
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="one-pager-${Date.now()}.html"`,
        },
      });
    }

    // Default: DOCX
    const buffer = await generateOnePagerDocx(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="one-pager-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
