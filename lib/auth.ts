/**
 * NextAuth entry point — server-only.
 * Auth secrets live in lib/auth.config.ts, which is never bundled to the client.
 *
 * GCP-only mode: OAuth is bypassed entirely. All requests are treated as
 * ori@compulocks.com so the allowlist and admin checks work normally.
 * Restore real OAuth when GCP identity-aware proxy or IAP is configured.
 */
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const nextAuth = NextAuth(authConfig);

// BYPASS_AUTH=true required to enable stub. Never set this on Vercel production.
// GCP: set via Secret Manager → Cloud Run env, restricted to the staging service.
const bypassAllowed = process.env.BYPASS_AUTH === 'true';

const STUB_SESSION = {
  user: { email: 'ori@compulocks.com', name: 'Ori Shavit', image: null },
  expires: '2099-01-01T00:00:00.000Z',
  accessToken: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubAuth = async (..._args: any[]) => STUB_SESSION as any;

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth = bypassAllowed ? stubAuth : nextAuth.auth;
