import { NextRequest, NextResponse } from 'next/server';
import { createExecutionContext } from '@/agent/core/execution-context';
import { auth } from '@/lib/auth';
import { checkInput } from '@/lib/guardrails';
import { handleViolation } from '@/lib/guardrail-logger';
import { assertNotBanned, bannedResponse, BannedUserError } from '@/lib/ban-check';

const SYSTEM_PROMPT = `You are a product requirements analyst for Compulocks, a company that makes device security enclosures, mounts, and point-of-sale hardware.

Given a free-form product description, extract structured fields for a Marketing Requirement Document.

Return ONLY valid JSON with this exact shape (omit fields you cannot confidently extract):
{
  "productName": "string — short product name",
  "description": "string — 2-4 sentence product description",
  "goal": "string — the primary business or market goal",
  "useCases": "string — 2-3 sentences describing practical use scenarios",
  "moq": "string — minimum order quantity e.g. '500 units'",
  "targetPrice": "string — target price range e.g. '$80-120'",
  "environments": ["indoor", "outdoor", "cloud", "on-prem", "mobile", "warehouse"],
  "industries": ["retail", "hospitality", "healthcare", "education", "enterprise", "government", "kiosk"],
  "roles": ["string — role names from context e.g. 'Store Manager', 'IT Admin']"
}

Only include environment/industry values from these exact lists:
- environments: indoor, outdoor, cloud, on-prem, mobile, warehouse
- industries: retail, hospitality, healthcare, education, enterprise, government, kiosk

Extract roles as job titles mentioned or implied by the description.`;

export async function POST(request: NextRequest) {
  let text: string;
  try {
    const body = await request.json();
    text = body?.text;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!text || text.trim().length < 20) {
    return NextResponse.json({ error: 'text must be at least 20 characters' }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.email ?? request.ip ?? 'anonymous';

  try {
    await assertNotBanned(userId);
  } catch (err) {
    if (err instanceof BannedUserError) return bannedResponse();
    throw err;
  }

  const inputCheck = checkInput(text);
  if (!inputCheck.passed) {
    await handleViolation({
      req: request,
      session,
      actionType: 'wizard-fill',
      inputText: text,
      violationTypes: inputCheck.violationTypes,
    });
    return NextResponse.json(
      { error: 'guardrail_violation', violationTypes: inputCheck.violationTypes },
      { status: 422 }
    );
  }

  const context = createExecutionContext({ requestId: `wizard-fill-${Date.now()}` });
  const provider = context.getProvider();

  let raw: string;
  try {
    const result = await provider.generateText(
      `Extract structured MRD fields from this product description:\n\n${text}`,
      SYSTEM_PROMPT
    );
    raw = result.text;
  } catch {
    return NextResponse.json({ error: 'AI provider failed' }, { status: 500 });
  }

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let fields: Record<string, unknown>;
  try {
    fields = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  return NextResponse.json({ fields });
}
