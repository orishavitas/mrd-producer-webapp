import { auth } from '@/lib/auth.edge';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BYPASS = process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production';

const ALLOWED_DOMAIN = 'compulocks.com';

function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  if (email.endsWith(`@${ALLOWED_DOMAIN}`)) return true;
  const extra = process.env.ALLOWED_EMAILS ?? '';
  return extra.split(',').map((e) => e.trim().toLowerCase()).includes(email.toLowerCase());
}

// AUTH BYPASS — GCP staging only (BYPASS_AUTH=true + NODE_ENV != production).
// To restore full OAuth: set BYPASS_AUTH=false or remove the env var.
export default BYPASS
  ? function middleware(_req: NextRequest) { return NextResponse.next(); }
  : auth((req) => {
      const { nextUrl, auth: session } = req as typeof req & { auth: { user?: { email?: string } } | null };
      const email = session?.user?.email;
      if (!session) return NextResponse.redirect(new URL('/login', nextUrl));
      if (!isAllowed(email)) return NextResponse.redirect(new URL('/access-denied', nextUrl));
      return NextResponse.next();
    });

export const config = {
  matcher: [
    '/((?!login|access-denied|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
