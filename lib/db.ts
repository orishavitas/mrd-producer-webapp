import { sql } from '@vercel/postgres';

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

export async function listDocuments(userId: string, toolType?: string): Promise<Document[]> {
  if (toolType && toolType !== 'all') {
    const { rows } = await sql`
      SELECT * FROM documents
      WHERE user_id = ${userId} AND deleted_at IS NULL AND tool_type = ${toolType}
      ORDER BY updated_at DESC
    `;
    return rows as Document[];
  }
  const { rows } = await sql`
    SELECT * FROM documents
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `;
  return rows as Document[];
}

export async function createDocument(
  userId: string,
  title: string,
  toolType: 'mrd' | 'one-pager' | 'brief',
  contentJson?: Record<string, unknown>
): Promise<Document> {
  const { rows } = await sql`
    INSERT INTO documents (id, user_id, title, tool_type, status, content_json, created_at, updated_at)
    VALUES (gen_random_uuid(), ${userId}, ${title}, ${toolType}, 'draft', ${JSON.stringify(contentJson || {})}, NOW(), NOW())
    RETURNING *
  `;
  return rows[0] as Document;
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

  const { rows } = await sql.query(
    `UPDATE documents SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
    [...values, id, userId]
  );
  return rows[0] as Document;
}

export async function softDeleteDocument(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE documents SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
