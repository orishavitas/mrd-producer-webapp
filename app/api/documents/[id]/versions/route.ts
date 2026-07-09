import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope } from '@/lib/gcs/documents';
import { isAdmin } from '@/lib/admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const doc = await getDocumentEnvelope('one-pager', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ version: doc.version, history: doc.versionHistory ?? [] });
}
