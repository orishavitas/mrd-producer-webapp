import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { query } from '@/lib/db-client';
import { invalidateAllowlistCache } from '@/lib/feature-gate';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await params;
  const target = decodeURIComponent(email).toLowerCase();

  if (target === session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot remove your own admin access' }, { status: 400 });
  }

  await query('DELETE FROM allowlist WHERE email = $1', [target]);
  invalidateAllowlistCache();
  return NextResponse.json({ ok: true });
}
