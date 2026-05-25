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
import { OnePagerAnalystAgent } from '@/agent/agents/prd/one-pager-analyst-agent';
import { PRDArchitectAgent } from '@/agent/agents/prd/prd-architect-agent';
import { createExecutionContext } from '@/agent/core/execution-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Phase 1 only: analyst + architect (~1-2 min)

/**
 * Encode object as NDJSON line (JSON + newline).
 */
function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

/**
 * Run an async operation while sending heartbeat events every 5s.
 * Keeps the stream alive during long AI calls.
 */
async function withHeartbeat<T>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  operation: () => Promise<T>
): Promise<T> {
  let done = false;
  const heartbeatLoop = (async () => {
    while (!done) {
      await new Promise((r) => setTimeout(r, 5000));
      if (!done) {
        try { controller.enqueue(encode({ type: 'heartbeat' })); } catch { /* stream may be closed */ }
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
        const architectResult = await withHeartbeat(controller, () =>
          architectAgent.execute({ summary }, context)
        );

        if (!architectResult.success || !architectResult.data) {
          throw new Error(architectResult.error || 'Architect agent failed');
        }

        const skeleton = architectResult.data;
        controller.enqueue(encode({ type: 'agent_done', agent: 'architect' }));

        // =====================================================================
        // Save skeleton, emit human_gate, close stream.
        // Phase 2 (Writer + QA) is triggered by POST /[run_id]/resume
        // after the user approves, avoiding a 30-min held connection.
        // =====================================================================
        await updatePipelineRunStatus(run.id, 'awaiting_approval', {
          skeleton_json: skeleton,
          agent_progress: { summary },
        });
        controller.enqueue(
          encode({
            type: 'human_gate',
            run_id: run.id,
            skeleton,
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
