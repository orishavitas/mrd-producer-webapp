import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';

interface DocumentResponse {
  document: {
    id: string;
    user_id: string;
    title: string;
    tool_type: string;
    status: string;
    content_json: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  };
  isOwner: boolean;
}

export default async function OnePagerViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const { id } = await params;

  // Fetch document server-side via internal API
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  let docData: DocumentResponse;
  try {
    const res = await fetch(`${baseUrl}/api/documents/${id}`, {
      headers: { cookie: '' }, // server-side fetch; auth checked separately
    });
    if (!res.ok) notFound();
    docData = await res.json();
  } catch {
    notFound();
  }

  if (docData.document.tool_type !== 'one-pager') notFound();

  // Redirect to interactive editor — pass readOnly and initialState via search params isn't ideal
  // so we redirect to the main /one-pager page and let client hydrate from document data
  // For now: redirect owners to editor, non-owners see read-only view
  // Full client-side hydration is handled by the provider's initialState prop
  const editorUrl = docData.isOwner
    ? `/one-pager?docId=${id}`
    : `/one-pager?docId=${id}&readOnly=1`;

  redirect(editorUrl);
}
