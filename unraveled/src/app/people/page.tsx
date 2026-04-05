export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { listPeople } from '@/lib/people';
import { listInstitutions } from '@/lib/institutions';
import { listLocations } from '@/lib/locations';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PeopleGrid } from './PeopleGrid';
import { createSessionSupabaseClient } from '@/lib/supabase-session';
import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata = {
  title: 'Dossiers — UnraveledTruth',
  description: 'People, groups, and locations connected to the most contested questions.',
};

export default async function PeoplePage() {
  // Gate: paid members only
  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/join');

  const admin = createServerSupabaseClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role ?? 'registered';
  if (role !== 'paid' && role !== 'admin') redirect('/upgrade');

  const [people, institutions, locations] = await Promise.all([
    listPeople({ status: 'published' }),
    listInstitutions(),
    listLocations(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-ground text-text-primary">
      <Header />

      <section className="border-b border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-5 flex items-center justify-between gap-8">
          <div>
            <span className="font-mono text-[8px] tracking-[0.25em] uppercase text-text-tertiary">Dossier Index</span>
            <h1 className="font-serif text-xl mt-0.5">Dossiers</h1>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="font-serif text-2xl text-gold">{people.length}</div>
              <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-text-tertiary">People</div>
            </div>
            <div className="text-right">
              <div className="font-serif text-2xl text-gold">{institutions.length}</div>
              <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-text-tertiary">Groups</div>
            </div>
            <div className="text-right">
              <div className="font-serif text-2xl text-gold">{locations.length}</div>
              <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-text-tertiary">Locations</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 flex-1">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <PeopleGrid
            people={people.filter((p) => p.slug != null).map((p) => ({ ...p, slug: p.slug! }))}
            institutions={institutions
              .filter((i) => i.slug)
              .map((i) => ({
                ...i,
                slug: i.slug!,
                founded_year: i.founded_year ? parseInt(i.founded_year, 10) : null,
              }))}
            locations={locations}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
