import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateDocument } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await updateDocument(id, session.user.email, { status: 'complete' });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }
}
