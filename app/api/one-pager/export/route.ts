import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createDocumentEnvelope } from '@/lib/gcs/documents';
import { saveDocumentToDrive } from '@/lib/drive/drive-sync';
import { summarizeChanges } from '@/lib/drive/change-summary';
import { generateOnePagerDocx, generateOnePagerHtml, type OnePagerData } from '@/lib/one-pager-export';

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const jsonStr = formData.get('__json__');
      if (!jsonStr || typeof jsonStr !== 'string') {
        return NextResponse.json({ error: 'Missing __json__ field' }, { status: 400 });
      }
      body = JSON.parse(jsonStr) as Record<string, unknown>;
    } else {
      body = await request.json();
    }

    const format = new URL(request.url).searchParams.get('format') || 'docx';
    const data: OnePagerData = body as unknown as OnePagerData;
    const title = data.productName || 'Untitled One-Pager';

    let docxBuffer: Buffer | undefined;
    let htmlString: string | undefined;

    if (format === 'html' || format === 'pdf') {
      htmlString = generateOnePagerHtml(data);
    } else {
      docxBuffer = await generateOnePagerDocx(data);
    }

    // Persist to GCS + Drive (fire-and-forget — never blocks the export response).
    auth()
      .then(async (session) => {
        if (!session?.user?.email) return;
        const envelope = await createDocumentEnvelope({
          toolType: 'one-pager',
          productName: title,
          userId: session.user!.email!,
          creatorName: session.user!.name ?? undefined,
          creatorEmail: session.user!.email!,
          contentJson: body,
        });
        await saveDocumentToDrive(
          envelope,
          { docx: docxBuffer, html: htmlString },
          summarizeChanges(null, body),
          session.user!.email!
        );
      })
      .catch((err) => console.error('[export] GCS/Drive persistence failed:', err instanceof Error ? err.message : err));

    if (format === 'html' || format === 'pdf') {
      if (format === 'pdf') {
        return NextResponse.json({ html: htmlString });
      }
      return new NextResponse(htmlString, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="one-pager-${Date.now()}.html"`,
        },
      });
    }

    return new NextResponse(new Uint8Array(docxBuffer!), {
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
