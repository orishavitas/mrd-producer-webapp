import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db-client';
import { Document, updateDocument } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { version } = await req.json() as { version: string };

  const { rows } = await sql<Document>`SELECT * FROM documents WHERE id = ${id} AND deleted_at IS NULL`;
  const doc = rows[0];
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const history: { version: string; saved_at: string; content_json: Record<string, unknown> }[] = doc.version_history ?? [];
  const snapshot = history.find((h) => h.version === version);
  if (!snapshot) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const updated = await updateDocument(id, doc.user_id, {
    content_json: snapshot.content_json,
    version: snapshot.version,
  });

  return NextResponse.json({ ok: true, document: updated });
}
