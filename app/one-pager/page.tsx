import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import OnePagerClient from './OnePagerClient';

export default async function OnePagerPage({
  searchParams,
}: {
  searchParams: Promise<{ docId?: string }>;
}) {
  const session = await auth();
  const adminUser = isAdmin(session?.user?.email);
  const { docId } = await searchParams;
  return <OnePagerClient isAdmin={adminUser} docId={docId ?? null} />;
}
