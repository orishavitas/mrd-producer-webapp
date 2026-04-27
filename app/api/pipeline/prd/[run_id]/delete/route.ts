import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPRDDocument, softDeletePRDDocument } from '@/lib/prd-db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { run_id: prd_id } = await params;
  const doc = await getPRDDocument(prd_id);

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (doc.created_by !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await softDeletePRDDocument(prd_id);
  return NextResponse.json({ success: true });
}
