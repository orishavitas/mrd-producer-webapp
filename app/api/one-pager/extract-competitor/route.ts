/**
 * POST /api/one-pager/extract-competitor
 *
 * Accepts a competitor URL, scrapes the page, and uses the AI provider
 * to extract structured competitor data (brand, product name, description,
 * cost, link, imageUrl).
 *
 * Delegates all business logic to CompetitorOrchestratorAgent so the route
 * handler stays thin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { createExecutionContext } from '@/agent/core/execution-context';
import { CompetitorOrchestratorAgent } from '@/agent/agents/one-pager/competitor-orchestrator';
import { auth } from '@/lib/auth';
import { checkInput, hardenSystemPrompt } from '@/lib/guardrails';
import { handleViolation } from '@/lib/guardrail-logger';
import { assertNotBanned, bannedResponse, BannedUserError } from '@/lib/ban-check';

const orchestrator = new CompetitorOrchestratorAgent();

export async function POST(request: NextRequest) {
  // ── Parse request ─────────────────────────────────────────────────────────
  let url: string;
  try {
    const body = await request.json();
    url = body?.url;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 });
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const session = await auth();
  const userId = session?.user?.email ?? request.ip ?? 'anonymous';

  // ── Ban check ────────────────────────────────────────────────────────────
  try {
    await assertNotBanned(userId);
  } catch (err) {
    if (err instanceof BannedUserError) return bannedResponse();
    throw err;
  }

  // ── Input guardrail check ────────────────────────────────────────────────
  const inputCheck = checkInput(url);
  if (!inputCheck.passed) {
    await handleViolation({
      req: request,
      session,
      actionType: 'extract-competitor',
      inputText: url,
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

  // ── Execute ───────────────────────────────────────────────────────────────
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);
  const context = createExecutionContext({ requestId });

  const result = await orchestrator.execute({ url }, context);

  if (!result.success || !result.data) {
    const message = result.error ?? 'Competitor extraction failed';
    logger.error('Orchestrator failed', { route: 'one-pager/extract-competitor', message });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
