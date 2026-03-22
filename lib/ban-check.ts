import { isUserBanned } from '@/lib/db';
import { NextResponse } from 'next/server';

export class BannedUserError extends Error {
  constructor() {
    super('Your account has been suspended. Please contact your administrator.');
    this.name = 'BannedUserError';
  }
}

export async function assertNotBanned(userId: string): Promise<void> {
  const banned = await isUserBanned(userId);
  if (banned) throw new BannedUserError();
}

export function bannedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'banned',
      message: 'Your account has been suspended. Please contact your administrator.',
    },
    { status: 403 }
  );
}
