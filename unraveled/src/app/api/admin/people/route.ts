import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { upsertPerson, upsertBioSection, upsertRelationship, deletePerson, listPeople } from '@/lib/people';

export const dynamic = 'force-dynamic';

// GET /api/admin/people — list all people (admin, bypass RLS)
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

  const { person, bio_sections, suggested_relationships } = body as Record<string, unknown>;

  if (!person || typeof person !== 'object') {
    return NextResponse.json({ error: 'person object required' }, { status: 400 });
  }

  const p = person as Record<string, unknown>;
  if (!p.full_name) {
    return NextResponse.json({ error: 'full_name required' }, { status: 400 });
  }

  try {
    // Upsert the person
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
      last_researched_at: new Date().toISOString(),
    });

    // Upsert bio sections
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

    // Add socials
    if (Array.isArray(p.socials)) {
      const supabase = createServerSupabaseClient();
      for (const social of p.socials as Record<string, unknown>[]) {
        await supabase.from('people_socials').upsert({
          person_id: saved.id,
          platform: social.platform,
          url: social.url,
          handle: social.handle ?? null,
          verified: false,
          active: true,
        }, { onConflict: 'person_id,platform,url' }).then(() => null, () => null);
      }
    }

    // Queue relationship suggestions (store as research queue items to resolve later)
    if (Array.isArray(suggested_relationships)) {
      const supabase = createServerSupabaseClient();
      for (const rel of suggested_relationships as Record<string, unknown>[]) {
        // Try to find the other person by name
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
