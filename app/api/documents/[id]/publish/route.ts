import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateDocument, getDocument } from '@/lib/db';

function bumpToPublished(currentVersion: string): string {
  // If already published (starts with 1.), increment minor
  if (currentVersion.startsWith('1.')) {
    const minor = parseInt(currentVersion.split('.')[1] ?? '0', 10);
    return `1.${minor + 1}`;
  }
  return '1.0';
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await getDocument(id);
    const newVersion = existing ? bumpToPublished(existing.version ?? '0.1') : '1.0';
    const doc = await updateDocument(id, session.user.email, { status: 'complete', version: newVersion });
    return NextResponse.json({ ok: true, version: doc.version });
  } catch {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await updateDocument(id, session.user.email, { status: 'draft' });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }
}
