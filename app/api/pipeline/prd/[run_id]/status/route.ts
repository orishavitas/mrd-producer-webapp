/**
 * Pipeline Run Status API
 *
 * GET /api/pipeline/prd/[run_id]/status
 *
 * Retrieves the current status and details of a pipeline run.
 * Used for polling pipeline progress and retrieving skeleton for approval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPipelineRun } from '@/lib/prd-db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { run_id } = await params;
  const run = await getPipelineRun(run_id);

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    status: run.status,
    skeleton: run.skeleton_json,
    agentProgress: run.agent_progress,
  });
}
