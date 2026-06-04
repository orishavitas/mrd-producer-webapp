/**
 * NextAuth entry point — server-only.
 * Auth secrets live in lib/auth.config.ts, which is never bundled to the client.
 *
 * BYPASS_AUTH=true skips OAuth entirely and returns a stub session.
 * Used for GCP staging when OAuth credentials are not yet configured.
 * Remove before production go-live.
 */
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const nextAuth = NextAuth(authConfig);

const bypassAllowed =
  process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production';

const STUB_SESSION = {
  // Synthetic non-admin identity — NOT a real user, NOT in ADMIN_EMAILS
  user: { email: 'staging-bypass@compulocks.com', name: 'Staging User', image: null },
  expires: '2099-01-01T00:00:00.000Z',
  accessToken: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubAuth = async (..._args: any[]) => {
  console.warn('[auth] BYPASS_AUTH active — returning stub session. Remove before production.');
  return STUB_SESSION as any;
};

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth = bypassAllowed ? stubAuth : nextAuth.auth;
