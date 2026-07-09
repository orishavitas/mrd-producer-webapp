/**
 * One-time migration: copies `documents` table rows (tool_type='one-pager')
 * from Postgres into GCS envelopes, preserving id/version/version_history.
 * Run manually: npx tsx scripts/migrate-documents-to-gcs.ts
 * Does not delete Postgres rows — verify GCS output before dropping the table.
 */
import { query } from '@/lib/db-client';
import { writeMigratedEnvelope, type DocumentEnvelope } from '@/lib/gcs/documents';

interface PostgresDocumentRow {
  id: string;
  user_id: string;
  title: string;
  status: 'draft' | 'complete';
  content_json: Record<string, unknown> | null;
  version: string;
  version_history: { version: string; saved_at: string; content_json: Record<string, unknown> }[];
  creator_name: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

async function main() {
  const { rows } = await query<PostgresDocumentRow>(
    `SELECT * FROM documents WHERE tool_type = 'one-pager'`
  );

  console.log(`Found ${rows.length} one-pager documents to migrate.`);

  for (const row of rows) {
    const envelope: DocumentEnvelope = {
      id: row.id,
      toolType: 'one-pager',
      productName: row.title,
      userId: row.user_id,
      creatorName: row.creator_name,
      creatorEmail: row.creator_email,
      status: row.status === 'complete' ? 'published' : 'draft',
      version: row.version,
      contentJson: row.content_json ?? {},
      versionHistory: (row.version_history ?? []).map((h) => ({
        version: h.version,
        savedAt: h.saved_at,
        contentJson: h.content_json,
      })),
      driveFolderId: null,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    await writeMigratedEnvelope(envelope);
    console.log(`Migrated ${row.id} (${row.title})`);
  }

  console.log('Migration complete. Verify GCS objects before dropping the documents table.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
