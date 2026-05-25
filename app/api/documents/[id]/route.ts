import { auth } from '@/lib/auth';
import { sql } from '@/lib/db-client';
import { Document, softDeleteDocument, updateDocument } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { rows } = await sql<Document>`SELECT * FROM documents WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    document: rows[0],
    isOwner: rows[0].user_id === session.user.email,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  try {
    // Fetch current to snapshot before overwrite
    const { rows: current } = await sql<Document>`SELECT * FROM documents WHERE id = ${id} AND deleted_at IS NULL`;
    const existing = current[0];
    if (!existing || existing.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    const history = [...(existing.version_history ?? [])];
    if (existing.content_json && Object.keys(existing.content_json).length > 0) {
      history.push({ version: existing.version, saved_at: new Date().toISOString(), content_json: existing.content_json });
      // Keep only last 20 snapshots
      if (history.length > 20) history.splice(0, history.length - 20);
    }

    const newVersion = body.version ?? existing.version;
    const doc = await updateDocument(id, session.user.email, {
      content_json: body.contentJson,
      version: newVersion,
      version_history: history,
    });
    return NextResponse.json({ ok: true, document: doc });
  } catch {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;
  const { id } = await params;

  try {
    await softDeleteDocument(id, userId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/documents/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
