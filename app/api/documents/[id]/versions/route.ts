import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db-client';
import { Document } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { rows } = await sql<Document>`SELECT version, version_history FROM documents WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ version: rows[0].version, history: rows[0].version_history ?? [] });
}
