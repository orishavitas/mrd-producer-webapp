import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
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

  const doc = await getDocumentEnvelope('one-pager', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const history = doc.versionHistory ?? [];
  const snapshot = history.find((h) => h.version === version);
  if (!snapshot) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const updated = await saveDocumentEnvelope({
    ...doc,
    contentJson: snapshot.contentJson,
    version: snapshot.version,
  });

  return NextResponse.json({ ok: true, document: updated });
}
