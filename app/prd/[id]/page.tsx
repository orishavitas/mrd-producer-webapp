import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDocumentEnvelope } from '@/lib/gcs/documents';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';
import PRDReviewClient from './PRDReviewClient';

export default async function PRDPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/api/auth/signin');

  const { id } = await params;
  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) redirect('/prd');

  return (
    <PRDReviewClient
      initialDocument={{ id: doc.id, version: doc.version, contentJson: doc.contentJson as unknown as PRDDocument }}
      currentUserEmail={session.user.email}
    />
  );
}
