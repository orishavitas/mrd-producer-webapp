import { getDriveClient } from '@/lib/drive/drive-client';

export const MASTER_FOLDERS = {
  'one-pager': '1iQvjoIRgRmP8tiUY1pPhT6ecrx_jNftl',
  prd: '1vUjZ1yaJCQ_azpAUs56pfAlCgTMqsaNw',
} as const;

function escapeForDriveQuery(name: string): string {
  return name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findOrCreateFolder(
  toolType: 'one-pager' | 'prd',
  productName: string
): Promise<string> {
  const drive = getDriveClient();
  const masterId = MASTER_FOLDERS[toolType];
  const escapedName = escapeForDriveQuery(productName);

  const { data } = await drive.files.list({
    q: `'${masterId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const existing = data.files?.[0];
  if (existing?.id) return existing.id;

  const { data: created } = await drive.files.create({
    requestBody: {
      name: productName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [masterId],
    },
    fields: 'id',
  });

  if (!created.id) throw new Error(`Failed to create Drive folder for ${productName}`);
  return created.id;
}

export async function resolveProjectFolder(
  toolType: 'one-pager' | 'prd',
  productName: string,
  cachedFolderId: string | null
): Promise<string> {
  if (cachedFolderId) {
    try {
      const drive = getDriveClient();
      const { data } = await drive.files.get({ fileId: cachedFolderId, fields: 'id, trashed' });
      if (data.id && !data.trashed) return data.id;
    } catch {
      // cached id no longer resolves (deleted, permissions changed) — fall through to search
    }
  }
  return findOrCreateFolder(toolType, productName);
}
