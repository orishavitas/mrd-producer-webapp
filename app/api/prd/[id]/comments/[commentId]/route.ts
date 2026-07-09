import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';
import { canAccessComments } from '@/app/api/prd/[id]/comments/route';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await canAccessComments(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, commentId } = await params;
  const { resolved } = await req.json();

  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const content = doc.contentJson as unknown as PRDDocument;
  const comment = content.comments.find((c) => c.id === commentId);
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  const isAuthor = comment.author === session.user.email;
  const isDocOwner = doc.userId === session.user.email;
  if (!isAuthor && !isDocOwner) {
    return NextResponse.json({ error: 'Only the comment author or document owner can resolve this' }, { status: 403 });
  }

  const updatedComments = content.comments.map((c) =>
    c.id === commentId ? { ...c, resolved: Boolean(resolved) } : c
  );
  const updatedContent: PRDDocument = { ...content, comments: updatedComments };
  await saveDocumentEnvelope({ ...doc, contentJson: updatedContent as unknown as Record<string, unknown> });

  return NextResponse.json({ comments: updatedComments });
}
