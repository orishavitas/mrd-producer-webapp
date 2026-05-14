/**
 * Edge-compatible auth config — no Node.js modules, no provider secrets.
 * Used only by middleware.ts which runs on the Vercel Edge runtime.
 * The full provider config (with Google OAuth) lives in lib/auth.config.ts.
 */
import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';

const edgeConfig: NextAuthConfig = {
  providers: [],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
};

export const { auth } = NextAuth(edgeConfig);
