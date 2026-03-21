import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow } from '@/lib/google-sheets';
import { ragAgent } from '@/agent/agents/one-pager-beta/rag-agent';

interface LogDocumentRequest {
  state: {
    sessionId: string;
    productName: string;
    preparedBy: string;
    userEmail: string;
    description: string;
    expandedDescription: string;
    goal: string;
    expandedGoal: string;
    useCases: string;
    expandedUseCases: string;
    context: { environments: string[]; industries: string[] };
    audience: { predefined: string[]; custom: string[] };
    features: { mustHave: string[]; niceToHave: string[] };
    commercials: { moq: string; targetPrice: string };
    competitors: { brand: string; productName: string; status: string }[];
  };
  exportFormat: string;
}

export async function POST(request: NextRequest) {
  let body: LogDocumentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const { state, exportFormat } = body;

  // Use expanded text if available, fall back to raw
  const description = state.expandedDescription || state.description || '';
  const goal = state.expandedGoal || state.goal || '';
  const useCases = state.expandedUseCases || state.useCases || '';

  const roles = [
    ...(state.audience?.predefined ?? []),
    ...(state.audience?.custom ?? []),
  ].join(', ');

  const competitors = (state.competitors ?? [])
    .filter((c) => c.status === 'done')
    .map((c) => [c.brand, c.productName].filter(Boolean).join(' - '))
    .join(', ');

  const row = [
    new Date().toISOString(),
    state.sessionId ?? '',
    state.productName ?? '',
    state.preparedBy ?? '',
    state.userEmail ?? '',
    description,
    goal,
    useCases,
    (state.context?.environments ?? []).join(', '),
    (state.context?.industries ?? []).join(', '),
    roles,
    (state.features?.mustHave ?? []).join(', '),
    (state.features?.niceToHave ?? []).join(', '),
    state.commercials?.moq ?? '',
    state.commercials?.targetPrice ?? '',
    competitors,
    exportFormat ?? '',
  ];

  try {
    await appendSheetRow(row);

    // Fire-and-forget RAG ingest
    ragAgent.ingest({
      sessionId: state.sessionId ?? '',
      productName: state.productName ?? '',
      description,
      goal,
      useCases,
      mustHave: state.features?.mustHave ?? [],
      niceToHave: state.features?.niceToHave ?? [],
      environments: state.context?.environments ?? [],
      industries: state.context?.industries ?? [],
    }).catch((err) => {
      console.error('[log-document] RAG ingest failed:', err instanceof Error ? err.message : err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[log-document] Sheets write failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false });
  }
}
