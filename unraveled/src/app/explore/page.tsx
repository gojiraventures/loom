import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ExploreClient } from './ExploreClient';
import { createSessionSupabaseClient } from '@/lib/supabase-session';
import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata = {
  title: 'Relationships — UnraveledTruth',
  description: 'Interactive relationship graph — navigate people and institutions across time.',
};

export default async function ExplorePage() {
  // Gate: paid members only
  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/join');

  const admin = createServerSupabaseClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role ?? 'registered';
  if (role !== 'paid' && role !== 'admin') redirect('/upgrade');

  return (
    <div className="min-h-screen flex flex-col bg-ground">
      <Header />
      <main className="flex-1 flex flex-col min-h-0">
        <ExploreClient />
      </main>
      <Footer />
    </div>
  );
}
