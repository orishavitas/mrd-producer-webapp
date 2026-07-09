import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, createDocumentEnvelope } from '@/lib/gcs/documents';
import { PRDGeneratorAgent } from '@/agent/agents/prd/prd-generator-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface GenerateRequest {
  onePagerId: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<GenerateRequest>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.onePagerId) {
    return NextResponse.json({ error: 'onePagerId is required' }, { status: 400 });
  }

  const onePager = await getDocumentEnvelope('one-pager', body.onePagerId);
  if (!onePager || onePager.deletedAt) {
    return NextResponse.json({ error: 'One-Pager document not found' }, { status: 404 });
  }

  const context = createExecutionContext({ requestId: `prd-generate-${body.onePagerId}` });
  const agent = new PRDGeneratorAgent();
  const result = await agent.execute({ onePagerContentJson: onePager.contentJson }, context);

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error || 'PRD generation failed' }, { status: 500 });
  }

  const productName = String(onePager.contentJson.productName ?? onePager.productName);
  const preparedBy = String(onePager.contentJson.preparedBy ?? session.user.name ?? session.user.email);

  const prdContent: PRDDocument = {
    sourceOnePagerId: onePager.id,
    productName,
    preparedBy,
    version: '0.1',
    status: 'draft',
    sections: result.data,
    comments: [],
  };

  const envelope = await createDocumentEnvelope({
    toolType: 'prd',
    productName,
    userId: session.user.email,
    creatorName: session.user.name ?? undefined,
    creatorEmail: session.user.email,
    contentJson: prdContent as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ document: envelope });
}
