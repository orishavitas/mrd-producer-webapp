import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { query } from '@/lib/db-client';
import { invalidateAllowlistCache } from '@/lib/feature-gate';

interface AllowlistRow {
  email: string;
  features: number[];
  invited_by: string | null;
  created_at: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { rows } = await query<AllowlistRow>(
    'SELECT email, features, invited_by, created_at FROM allowlist ORDER BY created_at DESC'
  );
  return NextResponse.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { email?: string; features?: number[] };
  const email = body.email?.trim().toLowerCase();
  const features = Array.isArray(body.features) ? body.features.filter((n) => Number.isInteger(n)) : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  await query(
    `INSERT INTO allowlist (email, features, invited_by, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (email) DO UPDATE SET features = $2, updated_at = now()`,
    [email, features, session.user.email]
  );

  invalidateAllowlistCache();
  return NextResponse.json({ ok: true });
}
