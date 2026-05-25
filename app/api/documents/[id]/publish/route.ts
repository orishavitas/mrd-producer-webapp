import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateDocument, getDocument } from '@/lib/db';

/** Publish always bumps major: 0.x→1.0, 1.x→2.0, 2.x→3.0 */
function bumpMajorVersion(currentVersion: string): string {
  const major = parseInt(currentVersion.split('.')[0] ?? '0', 10);
  return `${major + 1}.0`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await getDocument(id);
    const currentVersion = existing?.version ?? '0.1';
    const newVersion = bumpMajorVersion(currentVersion);

    // Snapshot current content into version_history before publishing
    const history: { version: string; saved_at: string; content_json: Record<string, unknown> }[] =
      Array.isArray(existing?.version_history) ? [...existing.version_history] : [];
    if (existing?.content_json) {
      history.push({
        version: currentVersion,
        saved_at: new Date().toISOString(),
        content_json: existing.content_json as Record<string, unknown>,
      });
      if (history.length > 20) history.splice(0, history.length - 20);
    }

    const doc = await updateDocument(id, session.user.email, {
      status: 'complete',
      version: newVersion,
      version_history: history,
    });
    return NextResponse.json({ ok: true, version: doc.version });
  } catch {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await updateDocument(id, session.user.email, { status: 'draft' });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }
}
