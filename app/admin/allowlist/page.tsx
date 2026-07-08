import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import AllowlistClient from './AllowlistClient';

export default async function AllowlistAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');
  if (!isAdmin(session.user.email)) redirect('/access-denied');

  return <AllowlistClient />;
}
