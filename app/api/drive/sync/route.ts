import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Stub — full Drive integration TBD
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ message: 'Drive sync not yet implemented' }, { status: 501 });
}
