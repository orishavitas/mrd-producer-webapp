/**
 * PRD Pipeline Resume API - Streaming endpoint
 *
 * POST /api/pipeline/prd/[run_id]/resume
 *
 * Phase 2 of the PRD pipeline. Called after the user approves the skeleton.
 * Runs Agent 3 (PRDWriterAgent) + Agent 4 (PRDQAAgent), saves the PRD document,
 * and emits NDJSON events tracking progress.
 *
 * Separated from /start so each phase fits within Vercel's function timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getPipelineRun,
  updatePipelineRunStatus,
  savePRDFrames,
  createPRDDocument,
} from '@/lib/prd-db';
import type { PRDSkeleton, OnePagerSummary } from '@/agent/agents/prd/types';
import { PRDWriterAgent } from '@/agent/agents/prd/prd-writer-agent';
import { PRDQAAgent } from '@/agent/agents/prd/prd-qa-agent';
import { createExecutionContext } from '@/agent/core/execution-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Writer + QA can take several minutes

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

async function withHeartbeat<T>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  operation: () => Promise<T>
): Promise<T> {
  let done = false;
  const heartbeatLoop = (async () => {
    while (!done) {
      await new Promise((r) => setTimeout(r, 5000));
      if (!done) {
        try { controller.enqueue(encode({ type: 'heartbeat' })); } catch { /* stream closed */ }
      }
    }
  })();

  try {
    const result = await operation();
    done = true;
    await heartbeatLoop;
    return result;
  } catch (err) {
    done = true;
    await heartbeatLoop;
    throw err;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { run_id } = await params;
  const run = await getPipelineRun(run_id);

  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  if (run.created_by !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (run.status !== 'approved') {
    return NextResponse.json({ error: 'Run is not in approved state' }, { status: 409 });
  }

  // Retrieve the analyst summary that was saved during Phase 1
  const summary = (run.agent_progress as Record<string, unknown>)?.summary as OnePagerSummary | undefined;
  if (!summary) {
    return NextResponse.json({ error: 'Missing analyst summary — cannot resume' }, { status: 422 });
  }

  const skeleton = run.skeleton_json as PRDSkeleton;
  const sourceDocumentId = run.source_document_id;
  const userEmail = session.user.email;

  const context = createExecutionContext({ requestId: `prd-resume-${run_id}` });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // ===================================================================
        // Agent 3: PRDWriterAgent
        // ===================================================================
        controller.enqueue(encode({ type: 'agent_start', agent: 'writer' }));
        const writerAgent = new PRDWriterAgent();
        const writerResult = await withHeartbeat(controller, () =>
          writerAgent.execute(
            {
              summary,
              skeleton,
              onSectionDone: (frame: { sectionKey: string; content: string }) => {
                controller.enqueue(
                  encode({ type: 'section_done', section: frame.sectionKey, content: frame.content })
                );
              },
            },
            context
          )
        );

        if (!writerResult.success || !writerResult.data) {
          throw new Error(writerResult.error || 'Writer agent failed');
        }

        const frames = writerResult.data;
        controller.enqueue(encode({ type: 'agent_done', agent: 'writer' }));

        // ===================================================================
        // Agent 4: PRDQAAgent
        // ===================================================================
        controller.enqueue(encode({ type: 'agent_start', agent: 'qa' }));
        const qaAgent = new PRDQAAgent();
        const qaResult = await withHeartbeat(controller, () =>
          qaAgent.execute(
            { frames, productName: summary.productName ?? '' },
            context
          )
        );

        if (!qaResult.success || !qaResult.data) {
          throw new Error(qaResult.error || 'QA agent failed');
        }

        const qaReport = qaResult.data;
        controller.enqueue(encode({ type: 'agent_done', agent: 'qa' }));

        // ===================================================================
        // Save to database
        // ===================================================================
        const prdDoc = await createPRDDocument(
          run_id,
          sourceDocumentId,
          summary.productName ?? 'Untitled PRD',
          userEmail,
          qaReport.score,
          qaReport.suggestions
        );
        await savePRDFrames(prdDoc.id, frames);
        await updatePipelineRunStatus(run_id, 'completed');

        controller.enqueue(
          encode({ type: 'pipeline_done', prd_document_id: prdDoc.id, qa_score: qaReport.score })
        );
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Resume failed';
        await updatePipelineRunStatus(run_id, 'failed').catch(() => {});
        controller.enqueue(encode({ type: 'error', message }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
