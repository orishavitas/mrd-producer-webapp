import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import OnePagerClient from './OnePagerClient';

export default async function OnePagerPage() {
  const session = await auth();
  const adminUser = isAdmin(session?.user?.email);
  return <OnePagerClient isAdmin={adminUser} />;
}
