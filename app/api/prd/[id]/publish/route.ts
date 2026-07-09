import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { saveDocumentToDrive } from '@/lib/drive/drive-sync';
import { summarizeChanges } from '@/lib/drive/change-summary';
import { generatePRDDocxV2, generatePRDHtmlV2 } from '@/lib/prd-document-generator';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';

function nextMajorVersion(current: string): string {
  const major = parseInt(current.split('.')[0], 10) || 0;
  return `${major + 1}.0`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await getDocumentEnvelope('prd', id);
  if (!existing || existing.deletedAt || existing.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }

  const existingContent = existing.contentJson as unknown as PRDDocument;
  const newVersion = existing.status === 'draft' ? '1.0' : nextMajorVersion(existing.version);
  const newContent: PRDDocument = { ...existingContent, version: newVersion, status: 'published' };

  const history = [...existing.versionHistory, {
    version: existing.version,
    savedAt: new Date().toISOString(),
    contentJson: existing.contentJson,
  }];
  if (history.length > 20) history.splice(0, history.length - 20);

  const updated = await saveDocumentEnvelope({
    ...existing,
    contentJson: newContent as unknown as Record<string, unknown>,
    version: newVersion,
    status: 'published',
    versionHistory: history,
  });

  const docx = await generatePRDDocxV2(newContent);
  const html = generatePRDHtmlV2(newContent, updated.id);

  const driveResult = await saveDocumentToDrive(
    updated,
    { docx, html },
    summarizeChanges(existing.contentJson, updated.contentJson),
    session.user.email
  );

  return NextResponse.json({ document: updated, driveSync: driveResult });
}
