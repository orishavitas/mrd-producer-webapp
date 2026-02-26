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
import { createExecutionContext } from '@/agent/core/execution-context';
import { CompetitorOrchestratorAgent } from '@/agent/agents/one-pager/competitor-orchestrator';

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

  // ── Execute ───────────────────────────────────────────────────────────────
  const context = createExecutionContext({
    requestId: `extract-competitor-${Date.now()}`,
  });

  const result = await orchestrator.execute({ url }, context);

  if (!result.success || !result.data) {
    const message = result.error ?? 'Competitor extraction failed';
    context.log('error', '[extract-competitor] Orchestrator failed', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
