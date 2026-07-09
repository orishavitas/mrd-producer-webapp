import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasFeature } from '@/lib/feature-gate';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { PRDDocument, PRDComment } from '@/agent/agents/prd/prd-document-types';

export async function canAccessComments(email: string): Promise<boolean> {
  return (
    (await hasFeature(email, 'commentor')) ||
    (await hasFeature(email, 'prd-producer')) ||
    (await hasFeature(email, 'rd-viewer'))
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canAccessComments(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const content = doc.contentJson as unknown as PRDDocument;
  return NextResponse.json({ comments: content.comments });
}

interface PostBody {
  sectionKey: string;
  body: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canAccessComments(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body: PostBody = await req.json();
  if (!body.sectionKey || !body.body) {
    return NextResponse.json({ error: 'sectionKey and body are required' }, { status: 400 });
  }

  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const content = doc.contentJson as unknown as PRDDocument;
  const newComment: PRDComment = {
    id: crypto.randomUUID(),
    sectionKey: body.sectionKey,
    author: session.user.email,
    body: body.body,
    createdAt: new Date().toISOString(),
    resolved: false,
  };
  const updatedContent: PRDDocument = { ...content, comments: [...content.comments, newComment] };

  await saveDocumentEnvelope({ ...doc, contentJson: updatedContent as unknown as Record<string, unknown> });

  return NextResponse.json({ comments: updatedContent.comments });
}
