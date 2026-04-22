/**
 * PRD Pipeline Start API - Streaming endpoint
 *
 * POST /api/pipeline/prd/start
 *
 * Initiates the 4-agent PRD Producer pipeline:
 * 1. OnePagerAnalystAgent - Normalises One-Pager content
 * 2. PRDArchitectAgent - Creates PRD skeleton
 * 3. [Human Gate] - User approves/modifies skeleton
 * 4. PRDWriterAgent - Writes all PRD sections
 * 5. PRDQAAgent - Quality assurance & scoring
 *
 * Returns streaming NDJSON events tracking pipeline progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocument } from '@/lib/db';
import {
  createPipelineRun,
  updatePipelineRunStatus,
  savePRDFrames,
  createPRDDocument,
  getPipelineRun,
} from '@/lib/prd-db';
import type { PRDSkeleton } from '@/agent/agents/prd/types';
import { OnePagerAnalystAgent } from '@/agent/agents/prd/one-pager-analyst-agent';
import { PRDArchitectAgent } from '@/agent/agents/prd/prd-architect-agent';
import { PRDWriterAgent } from '@/agent/agents/prd/prd-writer-agent';
import { PRDQAAgent } from '@/agent/agents/prd/prd-qa-agent';
import { createExecutionContext } from '@/agent/core/execution-context';

export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 3000;
const APPROVAL_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Encode object as NDJSON line (JSON + newline).
 */
function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

/**
 * Request body type.
 */
interface StartRequest {
  documentId: string;
}

/**
 * Stream event types.
 */
interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<StartRequest>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { documentId } = body;
  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
  }

  const doc = await getDocument(documentId);
  if (!doc || doc.tool_type !== 'one-pager') {
    return NextResponse.json({ error: 'One-Pager document not found' }, { status: 404 });
  }

  const run = await createPipelineRun(documentId, session.user.email);
  const context = createExecutionContext({
    requestId: `prd-start-${run.id}`,
  });

  /**
   * Stream implementation using ReadableStream.
   * Executes the 4-agent pipeline and emits NDJSON events.
   */
  const userEmail = session.user.email;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // =====================================================================
        // Agent 1: OnePagerAnalystAgent
        // =====================================================================
        controller.enqueue(encode({ type: 'agent_start', agent: 'analyst' }));
        const analystAgent = new OnePagerAnalystAgent();
        const analystResult = await analystAgent.execute(
          { contentJson: doc.content_json as Record<string, unknown> },
          context
        );

        if (!analystResult.success || !analystResult.data) {
          throw new Error(analystResult.error || 'Analyst agent failed');
        }

        const summary = analystResult.data;
        controller.enqueue(encode({ type: 'agent_done', agent: 'analyst' }));

        // =====================================================================
        // Agent 2: PRDArchitectAgent
        // =====================================================================
        controller.enqueue(encode({ type: 'agent_start', agent: 'architect' }));
        const architectAgent = new PRDArchitectAgent();
        const architectResult = await architectAgent.execute(
          { summary },
          context
        );

        if (!architectResult.success || !architectResult.data) {
          throw new Error(architectResult.error || 'Architect agent failed');
        }

        const skeleton = architectResult.data;
        controller.enqueue(encode({ type: 'agent_done', agent: 'architect' }));

        // =====================================================================
        // Save skeleton and emit human_gate event
        // =====================================================================
        await updatePipelineRunStatus(run.id, 'awaiting_approval', {
          skeleton_json: skeleton,
        });
        controller.enqueue(
          encode({
            type: 'human_gate',
            run_id: run.id,
            skeleton,
          })
        );

        // =====================================================================
        // Poll until approved or timeout (30 minutes)
        // =====================================================================
        const deadline = Date.now() + APPROVAL_TIMEOUT_MS;
        let approvedSkeleton = skeleton;
        let wasApproved = false;

        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          const fresh = await getPipelineRun(run.id);

          if (!fresh) {
            throw new Error('Pipeline run not found during polling');
          }

          if (fresh.status === 'approved') {
            approvedSkeleton = (fresh.skeleton_json as PRDSkeleton) ?? skeleton;
            wasApproved = true;
            controller.enqueue(
              encode({
                type: 'approval_confirmed',
                run_id: run.id,
              })
            );
            break;
          }

          if (fresh.status === 'failed') {
            throw new Error('Pipeline run marked as failed');
          }
        }

        if (!wasApproved) {
          throw new Error('Pipeline approval timeout (30 minutes)');
        }

        // =====================================================================
        // Agent 3: PRDWriterAgent
        // =====================================================================
        controller.enqueue(encode({ type: 'agent_start', agent: 'writer' }));
        const writerAgent = new PRDWriterAgent();
        const writerResult = await writerAgent.execute(
          {
            summary,
            skeleton: approvedSkeleton,
            onSectionDone: (frame: { sectionKey: string; content: string }) => {
              controller.enqueue(
                encode({
                  type: 'section_done',
                  section: frame.sectionKey,
                  content: frame.content,
                })
              );
            },
          },
          context
        );

        if (!writerResult.success || !writerResult.data) {
          throw new Error(writerResult.error || 'Writer agent failed');
        }

        const frames = writerResult.data;
        controller.enqueue(encode({ type: 'agent_done', agent: 'writer' }));

        // =====================================================================
        // Agent 4: PRDQAAgent
        // =====================================================================
        controller.enqueue(encode({ type: 'agent_start', agent: 'qa' }));
        const qaAgent = new PRDQAAgent();
        const qaResult = await qaAgent.execute(
          {
            frames,
            productName: summary.productName,
          },
          context
        );

        if (!qaResult.success || !qaResult.data) {
          throw new Error(qaResult.error || 'QA agent failed');
        }

        const qaReport = qaResult.data;
        controller.enqueue(encode({ type: 'agent_done', agent: 'qa' }));

        // =====================================================================
        // Save to database
        // =====================================================================
        const prdDoc = await createPRDDocument(
          run.id,
          documentId,
          summary.productName,
          userEmail,
          qaReport.score,
          qaReport.suggestions
        );
        await savePRDFrames(prdDoc.id, frames);
        await updatePipelineRunStatus(run.id, 'completed');

        // =====================================================================
        // Emit completion event
        // =====================================================================
        controller.enqueue(
          encode({
            type: 'pipeline_done',
            prd_document_id: prdDoc.id,
            qa_score: qaReport.score,
          })
        );
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Pipeline failed';
        await updatePipelineRunStatus(run.id, 'failed').catch(() => {
          // Swallow errors during error cleanup
        });
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
      'X-Run-Id': run.id,
    },
  });
}
