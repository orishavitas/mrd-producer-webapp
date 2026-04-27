import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocument } from '@/lib/db';
import { generateOnePagerDocx, generateOnePagerHtml, type OnePagerData } from '@/lib/one-pager-export';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (doc.user_id !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'docx';
  const data = doc.content_json as unknown as OnePagerData;
  const title = doc.title || 'one-pager';

  if (format === 'html') {
    const html = generateOnePagerHtml(data);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${title}.html"`,
      },
    });
  }

  const buffer = await generateOnePagerDocx(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${title}.docx"`,
    },
  });
}
