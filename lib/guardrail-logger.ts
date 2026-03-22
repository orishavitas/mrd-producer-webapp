import { NextRequest } from 'next/server';
import { Session } from 'next-auth';
import { logViolation, countViolations, banUser } from '@/lib/db';

export async function handleViolation(opts: {
  req: NextRequest;
  session: Session | null;
  actionType: string;
  inputText: string;
  violationTypes: string[];
}): Promise<{ banned: boolean }> {
  const { req, session, actionType, inputText, violationTypes } = opts;
  const userId = session?.user?.email ?? req.ip ?? 'anonymous';

  await logViolation({
    userId,
    userName: session?.user?.name ?? undefined,
    userEmail: session?.user?.email ?? undefined,
    ip: req.ip ?? req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
    actionType,
    inputText: inputText.slice(0, 2000),
    violationTypes,
  });

  const count = await countViolations(userId);
  if (count >= 2) {
    await banUser(userId, `Auto-banned after ${count} guardrail violations`);
    return { banned: true };
  }

  return { banned: false };
}
