import { getDriveClient } from '@/lib/drive/drive-client';
import { resolveProjectFolder } from '@/lib/drive/folder-resolver';

export interface DriveSyncExports {
  docx?: Buffer;
  html?: string;
  pdf?: Buffer;
}

export interface DriveSyncResult {
  driveFolderId: string;
  ok: boolean;
  error?: string;
}

interface SyncableEnvelope {
  id: string;
  toolType: 'one-pager' | 'prd';
  productName: string;
  version: string;
  status: 'draft' | 'published';
  contentJson: Record<string, unknown>;
  driveFolderId: string | null;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function typeLabel(toolType: 'one-pager' | 'prd'): string {
  return toolType === 'one-pager' ? 'One-Pager' : 'PRD';
}

async function findFileInFolder(folderId: string, exactName: string): Promise<string | null> {
  const drive = getDriveClient();
  const escaped = exactName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escaped}' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  return data.files?.[0]?.id ?? null;
}

async function uploadVersioned(
  folderId: string,
  name: string,
  content: Buffer | string,
  mimeType: string
): Promise<void> {
  const drive = getDriveClient();
  await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: content },
    fields: 'id',
  });
}

async function upsertOverwrite(
  folderId: string,
  name: string,
  content: string,
  mimeType: string
): Promise<void> {
  const drive = getDriveClient();
  const existingId = await findFileInFolder(folderId, name);
  if (existingId) {
    await drive.files.update({ fileId: existingId, media: { mimeType, body: content } });
  } else {
    await drive.files.create({
      requestBody: { name, parents: [folderId] },
      media: { mimeType, body: content },
      fields: 'id',
    });
  }
}

async function appendChangelog(
  folderId: string,
  productName: string,
  version: string,
  status: string,
  changeSummary: string,
  savedBy: string
): Promise<void> {
  const drive = getDriveClient();
  const changelogName = `${productName} - Changelog.md`;
  const existingId = await findFileInFolder(folderId, changelogName);

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const entry = `## v${version} — ${timestamp} — ${savedBy}\n- Status: ${status}\n- Summary: ${changeSummary}\n\n`;

  if (existingId) {
    const { data: existingContent } = await drive.files.get({ fileId: existingId, alt: 'media' });
    const merged = `${String(existingContent)}${entry}`;
    await drive.files.update({ fileId: existingId, media: { mimeType: 'text/markdown', body: merged } });
  } else {
    await drive.files.create({
      requestBody: { name: changelogName, parents: [folderId] },
      media: { mimeType: 'text/markdown', body: entry },
      fields: 'id',
    });
  }
}

export async function saveDocumentToDrive(
  envelope: SyncableEnvelope,
  exports: DriveSyncExports,
  changeSummary: string,
  savedBy: string
): Promise<DriveSyncResult> {
  try {
    const folderId = await resolveProjectFolder(envelope.toolType, envelope.productName, envelope.driveFolderId);
    const label = typeLabel(envelope.toolType);
    const stamp = todayStamp();
    const baseName = `${envelope.productName} - ${label} - v${envelope.version} - ${stamp}`;

    const uploads: Promise<void>[] = [];
    if (exports.docx) {
      uploads.push(
        uploadVersioned(
          folderId,
          `${baseName}.docx`,
          exports.docx,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      );
    }
    if (exports.html) {
      uploads.push(uploadVersioned(folderId, `${baseName}.html`, exports.html, 'text/html'));
    }
    if (exports.pdf) {
      uploads.push(uploadVersioned(folderId, `${baseName}.pdf`, exports.pdf, 'application/pdf'));
    }
    uploads.push(
      upsertOverwrite(
        folderId,
        `${envelope.productName}.json`,
        JSON.stringify(envelope.contentJson, null, 2),
        'application/json'
      )
    );

    await Promise.all(uploads);

    // Changelog last — should only record a save that actually succeeded.
    await appendChangelog(folderId, envelope.productName, envelope.version, envelope.status, changeSummary, savedBy);

    return { driveFolderId: folderId, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Drive error';
    return { driveFolderId: envelope.driveFolderId ?? '', ok: false, error: message };
  }
}
