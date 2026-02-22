import { auth } from '@/lib/auth';
import { listDocuments, createDocument } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;
  const toolType = req.nextUrl.searchParams.get('tool_type') ?? undefined;

  try {
    const documents = await listDocuments(userId, toolType);
    return NextResponse.json(documents);
  } catch (err) {
    console.error('GET /api/documents error:', err);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;

  try {
    const body = await req.json();
    const { title, tool_type, content_json } = body;

    if (!title || !tool_type) {
      return NextResponse.json({ error: 'title and tool_type are required' }, { status: 400 });
    }
    if (!['mrd', 'one-pager', 'brief'].includes(tool_type)) {
      return NextResponse.json({ error: 'Invalid tool_type' }, { status: 400 });
    }

    const doc = await createDocument(userId, title, tool_type, content_json);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('POST /api/documents error:', err);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
