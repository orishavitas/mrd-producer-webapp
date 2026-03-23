import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';
import { auth } from '@/lib/auth';
import { checkInput, checkOutput, hardenSystemPrompt } from '@/lib/guardrails';
import { handleViolation } from '@/lib/guardrail-logger';
import { logViolation } from '@/lib/db';
import { assertNotBanned, bannedResponse, BannedUserError } from '@/lib/ban-check';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse body
    const { text, field } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Text must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Step 2: Auth — get session
    const session = await auth();
    const userId = session?.user?.email ?? request.ip ?? 'anonymous';

    // Step 3: Ban check
    try {
      await assertNotBanned(userId);
    } catch (err) {
      if (err instanceof BannedUserError) return bannedResponse();
      throw err;
    }

    // Step 4: Input guardrail check
    const inputCheck = checkInput(text);
    if (!inputCheck.passed) {
      await handleViolation({
        req: request,
        session,
        actionType: 'expand',
        inputText: text,
        violationTypes: inputCheck.violationTypes,
      });
      return NextResponse.json(
        {
          error: 'guardrail_violation',
          violationTypes: inputCheck.violationTypes,
          message: 'Input rejected by content policy',
        },
        { status: 422 }
      );
    }

    // Step 5: Harden system prompt
    const baseSystemPrompt = `You are a professional product specification writer. Expand the user's brief ${field || 'description'} input into a clear, professional paragraph. Keep the original meaning. Do not add information the user didn't provide. Be concise but thorough. Return only the expanded text, no preamble.`;
    const systemPrompt = hardenSystemPrompt(baseSystemPrompt);

    // Step 6: AI call
    const chain = getProviderChain();
    const { result } = await chain.executeWithFallback(
      (provider) => provider.generateText(text, systemPrompt)
    );

    // Step 7: Output guardrail check
    const outputCheck = checkOutput(result.text);
    if (!outputCheck.passed) {
      // Log output violation for monitoring, but don't count toward ban
      await logViolation({
        userId,
        userName: session?.user?.name ?? undefined,
        userEmail: session?.user?.email ?? undefined,
        ip: request.ip ?? request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        actionType: 'expand-output',
        inputText: result.text.slice(0, 2000),
        violationTypes: outputCheck.violationTypes,
      });
      return NextResponse.json(
        {
          error: 'guardrail_violation',
          violationTypes: outputCheck.violationTypes,
          message: 'Output rejected by content policy',
        },
        { status: 422 }
      );
    }

    // Step 8: Return result
    return NextResponse.json({ expanded: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Expansion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
