import { sql, query } from '@/lib/db-client';

export interface Document {
  id: string;
  user_id: string;
  title: string;
  tool_type: 'mrd' | 'one-pager' | 'brief';
  status: 'draft' | 'complete';
  drive_file_id: string | null;
  drive_folder: string | null;
  content_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentWithCreator extends Document {
  creator_name: string | null;
  creator_email: string | null;
}

export interface ViolationRecord {
  userId: string;
  userName?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  actionType: string;
  inputText: string;
  violationTypes: string[];
}

export async function listDocuments(userId: string, toolType?: string): Promise<Document[]> {
  if (toolType && toolType !== 'all') {
    const { rows } = await sql<Document>`
      SELECT * FROM documents
      WHERE user_id = ${userId} AND deleted_at IS NULL AND tool_type = ${toolType}
      ORDER BY updated_at DESC
    `;
    return rows;
  }
  const { rows } = await sql<Document>`
    SELECT * FROM documents
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `;
  return rows;
}

export async function getDocument(id: string): Promise<Document | null> {
  const { rows } = await sql<Document>`
    SELECT * FROM documents WHERE id = ${id} AND deleted_at IS NULL
  `;
  return rows[0] ?? null;
}

export async function createDocument(
  userId: string,
  title: string,
  toolType: 'mrd' | 'one-pager' | 'brief',
  contentJson?: Record<string, unknown>,
  creatorName?: string,
  creatorEmail?: string
): Promise<Document> {
  const { rows } = await sql<Document>`
    INSERT INTO documents (id, user_id, title, tool_type, status, content_json, creator_name, creator_email, created_at, updated_at)
    VALUES (gen_random_uuid(), ${userId}, ${title}, ${toolType}, 'draft', ${JSON.stringify(contentJson || {})}, ${creatorName ?? null}, ${creatorEmail ?? null}, NOW(), NOW())
    RETURNING *
  `;
  return rows[0];
}

export async function updateDocument(
  id: string,
  userId: string,
  updates: Partial<Pick<Document, 'title' | 'status' | 'content_json' | 'drive_file_id' | 'drive_folder'>>
): Promise<Document> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(updates.title); }
  if (updates.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(updates.status); }
  if (updates.content_json !== undefined) { setClauses.push(`content_json = $${paramIndex++}`); values.push(JSON.stringify(updates.content_json)); }
  if (updates.drive_file_id !== undefined) { setClauses.push(`drive_file_id = $${paramIndex++}`); values.push(updates.drive_file_id); }
  if (updates.drive_folder !== undefined) { setClauses.push(`drive_folder = $${paramIndex++}`); values.push(updates.drive_folder); }

  if (values.length === 0) {
    throw new Error('updateDocument called with no fields to update');
  }

  const { rows } = await query<Document>(
    `UPDATE documents SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
    [...values, id, userId]
  );

  if (!rows[0]) {
    throw new Error(`Document ${id} not found or access denied`);
  }

  return rows[0];
}

export async function softDeleteDocument(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE documents SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function listDocumentsWithCreator(userId: string, toolType?: string): Promise<DocumentWithCreator[]> {
  if (toolType && toolType !== 'all') {
    const { rows } = await sql<DocumentWithCreator>`
      SELECT * FROM documents
      WHERE user_id = ${userId} AND deleted_at IS NULL AND tool_type = ${toolType}
      ORDER BY updated_at DESC
    `;
    return rows;
  }
  const { rows } = await sql<DocumentWithCreator>`
    SELECT * FROM documents
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `;
  return rows;
}

export async function logViolation(data: ViolationRecord): Promise<void> {
  await sql`
    INSERT INTO guardrail_violations (user_id, user_name, user_email, ip, user_agent, action_type, input_text, violation_type)
    VALUES (${data.userId}, ${data.userName ?? null}, ${data.userEmail ?? null}, ${data.ip ?? null}, ${data.userAgent ?? null}, ${data.actionType}, ${data.inputText}, ${data.violationTypes})
  `;
}

export async function countViolations(userId: string): Promise<number> {
  const { rows } = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM guardrail_violations WHERE user_id = ${userId}
  `;
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function banUser(userId: string, reason: string): Promise<void> {
  // Note: violation_count DEFAULT 2 corresponds to BAN_THRESHOLD in lib/guardrails.ts
  await sql`
    INSERT INTO banned_users (user_id, reason, violation_count)
    VALUES (${userId}, ${reason}, 2)
    ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, violation_count = banned_users.violation_count + 1
  `;
}

export async function unbanUser(userId: string): Promise<void> {
  await sql`DELETE FROM banned_users WHERE user_id = ${userId}`;
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const { rows } = await sql<{ user_id: string }>`
    SELECT user_id FROM banned_users WHERE user_id = ${userId}
  `;
  return rows.length > 0;
}
