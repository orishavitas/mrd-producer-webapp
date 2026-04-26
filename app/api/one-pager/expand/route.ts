import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';
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

    // Step 2: Fake session (temporary)
    const session = {
      user: { email: 'dev@local' },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    const userId = 'dev';

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

    // Step 5: Prompt
    const baseSystemPrompt = `You are a professional product specification writer. Expand the user's brief ${field || 'description'} input into a clear, professional paragraph. Keep the original meaning. Do not add information the user didn't provide. Be concise but thorough. Return only the expanded text, no preamble.`;

    const systemPrompt = hardenSystemPrompt(baseSystemPrompt);

    // 🔥 DEBUG LOGS (IMPORTANT)
    console.log('👉 Starting AI call');
    console.log('👉 GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);

    // Step 6: AI call
    const chain = getProviderChain();

    const { result } = await chain.executeWithFallback(
      (provider) => provider.generateText(text, systemPrompt)
    );

    // Step 7: Output guardrail
    const outputCheck = checkOutput(result.text);
    if (!outputCheck.passed) {
      await logViolation({
        userId,
        userName: undefined,
        userEmail: undefined,
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

    // Step 8: Success
    return NextResponse.json({ expanded: result.text });

  } catch (error) {
    // 🔥 CRITICAL DEBUG
    console.error('🔥 EXPAND API ERROR:', error);
    console.error('🔥 FULL ERROR JSON:', JSON.stringify(error, null, 2));

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Expansion failed',
        debug: String(error),
      },
      { status: 500 }
    );
  }
}
