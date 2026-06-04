import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// AUTH BYPASS — GCP staging only. Set BYPASS_AUTH=true to skip auth.
// To restore full OAuth: remove BYPASS_AUTH env var and restore original middleware.
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|access-denied|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
