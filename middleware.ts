// AUTH BYPASS — GCP staging only. Re-enable OAuth before production go-live.
// To restore: revert this file to the version with auth() middleware.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
