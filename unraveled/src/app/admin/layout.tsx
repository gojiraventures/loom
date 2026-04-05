import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { error } = await requireAdmin();
  if (error) redirect('/login?next=/admin');
  return <>{children}</>;
}
