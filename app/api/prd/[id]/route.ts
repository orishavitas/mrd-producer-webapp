import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { saveDocumentToDrive } from '@/lib/drive/drive-sync';
import { summarizeChanges } from '@/lib/drive/change-summary';
import { PRDDocument, PRDSection } from '@/agent/agents/prd/prd-document-types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ document: doc });
}

interface PatchBody {
  sections: PRDSection[];
  version?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body: PatchBody = await req.json();

  const existing = await getDocumentEnvelope('prd', id);
  if (!existing || existing.deletedAt || existing.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }

  const existingContent = existing.contentJson as unknown as PRDDocument;
  const history = [...existing.versionHistory];
  if (existing.contentJson) {
    history.push({ version: existing.version, savedAt: new Date().toISOString(), contentJson: existing.contentJson });
    if (history.length > 20) history.splice(0, history.length - 20);
  }

  const newVersion = body.version ?? existing.version;
  const newContent: PRDDocument = { ...existingContent, sections: body.sections, version: newVersion };

  const updated = await saveDocumentEnvelope({
    ...existing,
    contentJson: newContent as unknown as Record<string, unknown>,
    version: newVersion,
    versionHistory: history,
  });

  saveDocumentToDrive(
    updated,
    {},
    summarizeChanges(existing.contentJson, updated.contentJson),
    session.user.email
  ).catch((err) => console.error('[prd PATCH] Drive sync failed:', err instanceof Error ? err.message : err));

  return NextResponse.json({ document: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getDocumentEnvelope('prd', id);
  if (!existing || existing.userId !== session.user.email) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }

  await saveDocumentEnvelope({ ...existing, deletedAt: new Date().toISOString() });
  return new NextResponse(null, { status: 204 });
}
