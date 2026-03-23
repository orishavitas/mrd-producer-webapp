import { NextRequest, NextResponse } from 'next/server';
import { createExecutionContext } from '@/agent/core/execution-context';
import { ragAgent } from '@/agent/agents/one-pager-beta/rag-agent';
import { auth } from '@/lib/auth';
import { checkInput, hardenSystemPrompt } from '@/lib/guardrails';
import { handleViolation } from '@/lib/guardrail-logger';
import { assertNotBanned, bannedResponse, BannedUserError } from '@/lib/ban-check';

interface FeatureCategory {
  category: string;
  features: string[];
}

interface SuggestFeaturesRequest {
  description: string;
  goal?: string;
  useCases?: string;
  availableFeatures: FeatureCategory[];
}

const SYSTEM_PROMPT = `You are a product requirements analyst. Given a product description and a list of available feature chips, classify which features are Must Have (core to the product's function) and which are Nice to Have (beneficial but not essential).

Rules:
- Only return features from the provided list — exact label matches only
- If uncertain whether a feature applies, omit it entirely
- Must Have = the product cannot function properly without it
- Nice to Have = improves the product but is not essential
- Return strict JSON only, no explanation outside the JSON

JSON shape:
{
  "mustHave": ["exact label 1", "exact label 2"],
  "niceToHave": ["exact label 3"],
  "reasoning": "one sentence"
}`;

function buildRagContext(docs: import('@/agent/agents/one-pager-beta/rag-agent').RetrievedDoc[]): string {
  if (!docs.length) return '';
  const lines = ['Similar products in our database selected these features:'];
  for (const doc of docs) {
    const name = doc.productName || 'Unknown product';
    const mh = doc.mustHave.length ? `Must Have: ${doc.mustHave.join(', ')}` : '';
    const nth = doc.niceToHave.length ? `Nice to Have: ${doc.niceToHave.join(', ')}` : '';
    lines.push(`- ${name}: ${[mh, nth].filter(Boolean).join(' / ')}`);
  }
  lines.push('Use this as additional signal, but prioritize the product description.');
  return lines.join('\n');
}

function buildUserPrompt(req: SuggestFeaturesRequest): string {
  const lines: string[] = [];
  lines.push(`Product Description: ${req.description}`);
  if (req.goal) lines.push(`Goal: ${req.goal}`);
  if (req.useCases) lines.push(`Use Cases: ${req.useCases}`);
  lines.push('');
  lines.push('Available features (grouped by category):');
  for (const cat of req.availableFeatures) {
    lines.push(`${cat.category}: ${cat.features.join(', ')}`);
  }
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  let body: SuggestFeaturesRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.description || body.description.length < 20) {
    return NextResponse.json({ error: 'description must be at least 20 characters' }, { status: 400 });
  }

  if (!body.availableFeatures?.length) {
    return NextResponse.json({ error: 'availableFeatures is required' }, { status: 400 });
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
  const inputCheck = checkInput(body.description);
  if (!inputCheck.passed) {
    await handleViolation({
      req: request,
      session,
      actionType: 'suggest-features',
      inputText: body.description,
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

  const context = createExecutionContext({ requestId: `suggest-features-${Date.now()}` });
  const provider = context.getProvider();

  // Attempt RAG retrieval — graceful degradation if unavailable
  let ragContext = '';
  try {
    const queryText = [body.description, body.goal, body.useCases].filter(Boolean).join('\n');
    const similar = await ragAgent.retrieve(queryText, 5);
    ragContext = buildRagContext(similar);
  } catch {
    // RAG unavailable — continue without it
  }

  const userPrompt = buildUserPrompt(body) + (ragContext ? `\n\n${ragContext}` : '');

  let raw: string;
  try {
    const result = await provider.generateText(userPrompt, SYSTEM_PROMPT);
    raw = result.text;
  } catch (err) {
    return NextResponse.json({ error: 'AI provider failed' }, { status: 500 });
  }

  // Strip markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: { mustHave?: unknown; niceToHave?: unknown };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  // Collect all valid labels
  const allLabels = new Set(body.availableFeatures.flatMap((c) => c.features));
  const filterValid = (arr: unknown): string[] =>
    Array.isArray(arr) ? (arr as unknown[]).filter((x): x is string => typeof x === 'string' && allLabels.has(x)) : [];

  return NextResponse.json({
    mustHave: filterValid(parsed.mustHave),
    niceToHave: filterValid(parsed.niceToHave),
  });
}
