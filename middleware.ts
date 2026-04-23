import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const ALLOWED_DOMAIN = 'compulocks.com';

function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  if (email.endsWith(`@${ALLOWED_DOMAIN}`)) return true;
  const extra = process.env.ALLOWED_EMAILS ?? '';
  return extra.split(',').map((e) => e.trim().toLowerCase()).includes(email.toLowerCase());
}

export default auth((req) => {
  const { nextUrl, auth: session } = req as typeof req & { auth: { user?: { email?: string } } | null };
  const email = session?.user?.email;

  // Not logged in → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // Logged in but not allowed → redirect to access-denied
  if (!isAllowed(email)) {
    return NextResponse.redirect(new URL('/access-denied', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!login|access-denied|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
