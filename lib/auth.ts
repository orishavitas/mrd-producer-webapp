/**
 * NextAuth entry point — server-only.
 * Auth secrets live in lib/auth.config.ts, which is never bundled to the client.
 */
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
