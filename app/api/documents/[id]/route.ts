import { auth } from '@/lib/auth';
import { softDeleteDocument } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;

  try {
    await softDeleteDocument(params.id, userId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/documents/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
