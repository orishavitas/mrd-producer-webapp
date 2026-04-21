import { sql, query } from '@/lib/db-client';

export interface PipelineRun {
  id: string;
  source_document_id: string;
  status: 'running' | 'awaiting_approval' | 'approved' | 'completed' | 'failed';
  skeleton_json: PRDSkeletonSection[] | null;
  agent_progress: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PRDDocument {
  id: string;
  run_id: string;
  source_document_id: string;
  product_name: string;
  qa_score: number | null;
  qa_suggestions: { sectionKey: string; note: string }[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PRDFrame {
  id: string;
  prd_document_id: string;
  section_key: string;
  section_order: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PRDSkeletonSection {
  sectionKey: string;
  sectionTitle: string;
  strategy: string;
  writingDirective: string;
}

export async function createPipelineRun(
  sourceDocumentId: string,
  createdBy: string
): Promise<PipelineRun> {
  const { rows } = await sql<PipelineRun>`
    INSERT INTO pipeline_runs (source_document_id, status, agent_progress, created_by)
    VALUES (${sourceDocumentId}, 'running', '{}', ${createdBy})
    RETURNING *
  `;
  return rows[0];
}

export async function getPipelineRun(id: string): Promise<PipelineRun | null> {
  const { rows } = await sql<PipelineRun>`
    SELECT * FROM pipeline_runs WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function updatePipelineRunStatus(
  id: string,
  status: PipelineRun['status'],
  extra?: { skeleton_json?: PRDSkeletonSection[]; agent_progress?: Record<string, unknown> }
): Promise<PipelineRun> {
  const sets: string[] = ['status = $2', 'updated_at = NOW()'];
  const values: unknown[] = [id, status];
  let idx = 3;

  if (extra?.skeleton_json !== undefined) {
    sets.push(`skeleton_json = $${idx++}`);
    values.push(JSON.stringify(extra.skeleton_json));
  }
  if (extra?.agent_progress !== undefined) {
    sets.push(`agent_progress = $${idx++}`);
    values.push(JSON.stringify(extra.agent_progress));
  }

  const { rows } = await query<PipelineRun>(
    `UPDATE pipeline_runs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  if (!rows[0]) {
    throw new Error(`Pipeline run ${id} not found`);
  }
  return rows[0];
}

export async function createPRDDocument(
  runId: string,
  sourceDocumentId: string,
  productName: string,
  createdBy: string,
  qaScore: number,
  qaSuggestions: { sectionKey: string; note: string }[]
): Promise<PRDDocument> {
  const { rows } = await sql<PRDDocument>`
    INSERT INTO prd_documents (run_id, source_document_id, product_name, created_by, qa_score, qa_suggestions)
    VALUES (${runId}, ${sourceDocumentId}, ${productName}, ${createdBy}, ${qaScore}, ${JSON.stringify(qaSuggestions)})
    RETURNING *
  `;
  return rows[0];
}

export async function getPRDDocument(id: string): Promise<PRDDocument | null> {
  const { rows } = await sql<PRDDocument>`
    SELECT * FROM prd_documents WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function savePRDFrames(
  prdDocumentId: string,
  frames: { sectionKey: string; sectionOrder: number; content: string }[]
): Promise<void> {
  for (const frame of frames) {
    await sql`
      INSERT INTO prd_frames (prd_document_id, section_key, section_order, content)
      VALUES (${prdDocumentId}, ${frame.sectionKey}, ${frame.sectionOrder}, ${frame.content})
    `;
  }
}

export async function getPRDFrames(prdDocumentId: string): Promise<PRDFrame[]> {
  const { rows } = await sql<PRDFrame>`
    SELECT * FROM prd_frames WHERE prd_document_id = ${prdDocumentId} ORDER BY section_order ASC
  `;
  return rows;
}
