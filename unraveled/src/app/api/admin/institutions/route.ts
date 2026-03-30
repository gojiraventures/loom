import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { listInstitutions, upsertInstitution, upsertBioSection, deleteInstitution } from '@/lib/institutions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET /api/admin/institutions — list all institutions
export async function GET() {
  try {
    const institutions = await listInstitutions();
    return NextResponse.json({ institutions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/admin/institutions — create/upsert institution with all related data
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { institution, bio_sections, suggested_relationships } = body as Record<string, unknown>;

  if (!institution || typeof institution !== 'object') {
    return NextResponse.json({ error: 'institution object required' }, { status: 400 });
  }

  const inst = institution as Record<string, unknown>;
  if (!inst.name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // 1. Upsert the institution
    const { id } = await upsertInstitution({
      slug: inst.slug,
      name: inst.name,
      short_name: inst.short_name ?? null,
      known_as: inst.known_as ?? null,
      short_bio: inst.short_bio ?? null,
      bio: inst.bio ?? null,
      institution_type: inst.institution_type ?? 'other',
      sub_type: inst.sub_type ?? null,
      founded_year: inst.founded_year ?? null,
      founded_location: inst.founded_location ?? null,
      founder: inst.founder ?? null,
      headquarters_city: inst.headquarters_city ?? null,
      headquarters_state: inst.headquarters_state ?? null,
      headquarters_country: inst.headquarters_country ?? null,
      active: inst.active ?? true,
      transparency_tier: inst.transparency_tier ?? 'standard',
      relevance_summary: inst.relevance_summary ?? null,
      controversy_summary: inst.controversy_summary ?? null,
      website_url: inst.website_url ?? null,
      wikipedia_url: inst.wikipedia_url ?? null,
      status: inst.status ?? 'draft',
      featured: inst.featured ?? false,
      last_researched_at: new Date().toISOString(),
    });

    // 2. Upsert bio sections
    if (Array.isArray(bio_sections)) {
      for (let i = 0; i < bio_sections.length; i++) {
        const s = bio_sections[i] as Record<string, unknown>;
        await upsertBioSection(id, {
          section_type: s.section_type,
          title: s.title,
          content: s.content,
          sort_order: (s.sort_order as number) ?? i,
          agent_generated: (s.agent_generated as boolean) ?? true,
        });
      }
    }

    // 3. Auto-resolve suggested institution relationships
    if (Array.isArray(suggested_relationships)) {
      for (const rel of suggested_relationships as Record<string, unknown>[]) {
        if (!rel.institution_name) continue;
        const { data: match } = await supabase
          .from('institutions')
          .select('id')
          .ilike('name', `%${rel.institution_name}%`)
          .limit(1)
          .single();

        if (match) {
          await supabase.from('institution_relationships').upsert({
            source_id: id,
            target_id: match.id,
            relationship_type: rel.relationship_type,
            description: rel.description ?? null,
            covert: rel.covert ?? false,
            start_year: rel.start_year ?? null,
          }, { onConflict: 'source_id,target_id,relationship_type' }).then(() => null, () => null);
        }
      }
    }

    return NextResponse.json({ id, institution: inst });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/admin/institutions]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/admin/institutions — update fields by id
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
      .from('institutions')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ institution: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/admin/institutions?id=...
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await deleteInstitution(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
