import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { upsertPerson, upsertBioSection, upsertRelationship, deletePerson, listPeople } from '@/lib/people';

export const dynamic = 'force-dynamic';

// Valid platform values from the CHECK constraint
const VALID_PLATFORMS = new Set([
  'x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit',
  'threads', 'bluesky', 'truth_social', 'substack', 'patreon', 'spotify',
  'apple_podcasts', 'rumble', 'odysee', 'bitchute', 'locals', 'gumroad',
  'website', 'blog', 'amazon_author', 'google_scholar', 'researchgate',
  'academia_edu', 'imdb', 'wikipedia', 'discord', 'telegram', 'newsletter',
  'merch_store', 'other',
]);

const PLATFORM_ALIASES: Record<string, string> = {
  twitter: 'x',
  'x.com': 'x',
  'twitter.com': 'x',
  web: 'website',
  site: 'website',
  personal_website: 'website',
  substack_newsletter: 'substack',
  podcast: 'spotify',
  apple_podcast: 'apple_podcasts',
  'google scholar': 'google_scholar',
  researchgate_net: 'researchgate',
  academia: 'academia_edu',
};

function normalizePlatform(raw: string): string {
  const lower = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (VALID_PLATFORMS.has(lower)) return lower;
  if (PLATFORM_ALIASES[lower]) return PLATFORM_ALIASES[lower];
  // Try partial match
  for (const valid of VALID_PLATFORMS) {
    if (lower.includes(valid) || valid.includes(lower)) return valid;
  }
  return 'other';
}

async function upsertSocial(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  personId: string,
  platform: string,
  url: string,
  handle?: string | null,
  sortOrder = 99,
) {
  const normalizedPlatform = normalizePlatform(platform);
  if (!url?.trim()) return;
  await supabase.from('people_socials').upsert({
    person_id: personId,
    platform: normalizedPlatform,
    url: url.trim(),
    handle: handle ?? null,
    verified: false,
    active: true,
    sort_order: sortOrder,
  }, { onConflict: 'person_id,platform,url' }).then(() => null, () => null);
}

// GET /api/admin/people — list all people
export async function GET() {
  try {
    const people = await listPeople();
    return NextResponse.json({ people });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/admin/people — create/update person with all related data
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { person, bio_sections, suggested_relationships, suggested_books } = body as Record<string, unknown>;

  if (!person || typeof person !== 'object') {
    return NextResponse.json({ error: 'person object required' }, { status: 400 });
  }

  const p = person as Record<string, unknown>;
  if (!p.full_name) {
    return NextResponse.json({ error: 'full_name required' }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // 1. Upsert the person
    const saved = await upsertPerson({
      slug: p.slug as string,
      full_name: p.full_name as string,
      known_as: p.known_as as string[] | undefined,
      short_bio: p.short_bio as string | undefined,
      bio: p.bio as string | undefined,
      born_date: p.born_date as string | undefined,
      born_location: p.born_location as string | undefined,
      died_date: p.died_date as string | undefined,
      nationality: p.nationality as string | undefined,
      credibility_tier: (p.credibility_tier as string) ?? 'unclassified',
      current_role: p.current_role as string | undefined,
      work_history: p.work_history,
      education: p.education,
      notable_claims: p.notable_claims,
      key_positions: p.key_positions as string[] | undefined,
      website_url: p.website_url as string | undefined,
      twitter_handle: p.twitter_handle as string | undefined,
      wikipedia_url: p.wikipedia_url as string | undefined,
      status: (p.status as string) ?? 'draft',
      featured: (p.featured as boolean) ?? false,
      faith: p.faith as string | undefined,
      faith_status: (p.faith_status as string) ?? 'unknown',
      political_party: p.political_party as string | undefined,
      political_party_status: (p.political_party_status as string) ?? 'unknown',
      last_researched_at: new Date().toISOString(),
    });

    // 2. Upsert bio sections
    if (Array.isArray(bio_sections)) {
      for (let i = 0; i < bio_sections.length; i++) {
        const s = bio_sections[i] as Record<string, unknown>;
        await upsertBioSection({
          person_id: saved.id,
          section_type: s.section_type as string,
          title: s.title as string,
          content: s.content as string,
          sort_order: (s.sort_order as number) ?? i,
          sources: s.sources ?? [],
          agent_generated: (s.agent_generated as boolean) ?? true,
          manually_edited: false,
        });
      }
    }

    // 3. Seed socials from top-level fields (website, twitter, wikipedia)
    let sortIdx = 0;
    if (p.website_url) {
      await upsertSocial(supabase, saved.id, 'website', p.website_url as string, null, sortIdx++);
    }
    if (p.twitter_handle) {
      const handle = p.twitter_handle as string;
      const url = handle.startsWith('http') ? handle : `https://x.com/${handle.replace('@', '')}`;
      await upsertSocial(supabase, saved.id, 'x', url, handle.startsWith('@') ? handle : `@${handle}`, sortIdx++);
    }
    if (p.wikipedia_url) {
      await upsertSocial(supabase, saved.id, 'wikipedia', p.wikipedia_url as string, null, sortIdx++);
    }

    // 4. Add socials from AI socials array (normalized)
    if (Array.isArray(p.socials)) {
      for (const social of p.socials as Record<string, unknown>[]) {
        await upsertSocial(
          supabase, saved.id,
          social.platform as string,
          social.url as string,
          social.handle as string | null,
          sortIdx++,
        );
      }
    }

    // 5. Save suggested books + link to person
    const booksToProcess = Array.isArray(suggested_books)
      ? suggested_books
      : Array.isArray(p.suggested_books) ? p.suggested_books : [];

    for (const bookRaw of booksToProcess as Record<string, unknown>[]) {
      if (!bookRaw.title || !bookRaw.author_name) continue;

      // Upsert book
      const bookSlug = (bookRaw.title as string)
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const { data: book } = await supabase
        .from('books')
        .upsert({
          slug: bookSlug,
          title: bookRaw.title,
          author_name: bookRaw.author_name,
          published_year: bookRaw.published_year ?? null,
          amazon_url: bookRaw.amazon_url ?? null,
          description: bookRaw.description ?? null,
          author_person_id: bookRaw.relationship === 'author' || bookRaw.relationship === 'co_author'
            ? saved.id : null,
          status: 'published',
        }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (book) {
        await supabase.from('people_books_link').upsert({
          person_id: saved.id,
          book_id: book.id,
          relationship: (bookRaw.relationship as string) ?? 'mentioned',
          context: bookRaw.context as string ?? null,
        }, { onConflict: 'person_id,book_id,relationship' }).then(() => null, () => null);
      }
    }

    // 6. Auto-link institutional affiliations (create institution draft if not found)
    const affiliations = Array.isArray(p.suggested_institutional_affiliations)
      ? p.suggested_institutional_affiliations
      : [];
    for (const aff of affiliations as Record<string, unknown>[]) {
      if (!aff.institution_name) continue;

      // Try to find existing institution by name
      let { data: inst } = await supabase
        .from('institutions')
        .select('id')
        .ilike('name', `%${aff.institution_name}%`)
        .limit(1)
        .maybeSingle();

      // Auto-create as draft if not found
      if (!inst) {
        const instSlug = (aff.institution_name as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const { data: created } = await supabase
          .from('institutions')
          .insert({
            slug: instSlug,
            name: aff.institution_name as string,
            institution_type: (aff.institution_type as string) ?? 'other',
            status: 'draft',
            short_bio: (aff.description as string) ?? null,
          })
          .select('id')
          .single()
          .then((r) => r, () => ({ data: null }));
        inst = created;
      }

      if (inst) {
        await supabase.from('people_institutions').upsert({
          person_id: saved.id,
          institution_id: inst.id,
          relationship: (aff.relationship as string) ?? 'member',
          role_title: (aff.role_title as string) ?? null,
          description: (aff.description as string) ?? null,
          start_year: (aff.start_year as string) ?? null,
          end_year: (aff.end_year as string) ?? null,
          covert: (aff.covert as boolean) ?? false,
          declassified: false,
          membership_status: (aff.membership_status as string) ?? 'unknown',
        }, { onConflict: 'person_id,institution_id,relationship' }).then(() => null, () => null);
      }
    }

    // 7. Auto-resolve relationship suggestions
    if (Array.isArray(suggested_relationships)) {
      for (const rel of suggested_relationships as Record<string, unknown>[]) {
        if (!rel.person_name) continue;
        const { data: match } = await supabase
          .from('people')
          .select('id')
          .ilike('full_name', `%${rel.person_name}%`)
          .limit(1)
          .single();

        if (match) {
          await upsertRelationship({
            person_a_id: saved.id,
            person_b_id: match.id,
            relationship_type: rel.relationship_type as string,
            description: rel.description as string | undefined,
            strength: (rel.strength as number) ?? 3,
            bidirectional: (rel.bidirectional as boolean) ?? true,
            start_year: rel.start_year as string | undefined,
          }).catch(() => null);
        }
      }
    }

    return NextResponse.json({ person: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/admin/people]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/admin/people — update fields
export async function PATCH(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, ...fields } = body as Record<string, unknown>;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('people')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ person: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/admin/people?id=...
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await deletePerson(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
