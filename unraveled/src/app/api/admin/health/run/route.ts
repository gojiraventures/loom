import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import { after } from 'next/server';

export const maxDuration = 300;

const anthropic = new Anthropic();

// ── Helpers ───────────────────────────────────────────────────────────────────

function wikiSlug(name: string) {
  return name.trim().replace(/\s+/g, '_');
}

function buildExternalUrls(name: string) {
  const slug = wikiSlug(name);
  return {
    wikipedia_url: `https://en.wikipedia.org/wiki/${slug}`,
    grokipedia_url: `https://grokipedia.com/page/${slug}`,
  };
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeName(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function buildDossierText(output: Record<string, unknown>) {
  return [
    (output.executive_summary as string) ?? '',
    (output.advocate_case as string) ?? '',
    (output.skeptic_case as string) ?? '',
    ...((output.key_findings as { finding?: string }[]) ?? []).map(f => f.finding ?? ''),
    ...((output.jaw_drop_layers as { title?: string; content?: string }[]) ?? []).map(l => `${l.title ?? ''} ${l.content ?? ''}`),
  ].filter(Boolean).join('\n\n').slice(0, 8000);
}

async function logRun(supabase: ReturnType<typeof createServerSupabaseClient>, action: string, id: string, summary: Record<string, unknown>) {
  await supabase.from('maintenance_runs').update({
    status: 'complete',
    finished_at: new Date().toISOString(),
    summary,
  }).eq('id', id);
}

async function logError(supabase: ReturnType<typeof createServerSupabaseClient>, id: string, error: string) {
  await supabase.from('maintenance_runs').update({
    status: 'failed',
    finished_at: new Date().toISOString(),
    error,
  }).eq('id', id);
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function runBackfillLinks(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const tables = [
    { table: 'people', nameField: 'full_name' },
    { table: 'institutions', nameField: 'name' },
    { table: 'locations', nameField: 'name' },
  ] as const;

  let total = 0;
  const details: Record<string, number> = {};

  for (const { table, nameField } of tables) {
    const { data: rows } = await supabase
      .from(table)
      .select(`id, ${nameField}, wikipedia_url, grokipedia_url`)
      .or('wikipedia_url.is.null,grokipedia_url.is.null');

    let updated = 0;
    for (const row of rows ?? []) {
      const name = (row as Record<string, string>)[nameField];
      if (!name) continue;
      const urls = buildExternalUrls(name);
      const patch: Record<string, string> = {};
      if (!row.wikipedia_url) patch.wikipedia_url = urls.wikipedia_url;
      if (!row.grokipedia_url) patch.grokipedia_url = urls.grokipedia_url;
      if (Object.keys(patch).length === 0) continue;
      await supabase.from(table).update(patch).eq('id', row.id);
      updated++;
    }
    details[table] = updated;
    total += updated;
  }

  return { updated: total, details };
}

async function runBackfillTopics(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: dossiers } = await supabase
    .from('topic_dossiers')
    .select('id, title, synthesized_output')
    .eq('published', true)
    .not('synthesized_output', 'is', null);

  const { data: people } = await supabase
    .from('people')
    .select('id, full_name, credibility_tier');

  function mapRole(tier: string | null) {
    const t = (tier ?? '').toLowerCase();
    if (t === 'whistleblower') return 'whistleblower';
    if (t === 'journalist') return 'journalist';
    if (t === 'historical_figure') return 'historical_figure';
    if (t === 'witness') return 'witness';
    if (t === 'academic' || t === 'independent_researcher') return 'researcher';
    return 'related';
  }

  const linkable = (people ?? []).filter(p => p.full_name && p.full_name.trim().length >= 6);
  let totalLinks = 0;

  for (const dossier of dossiers ?? []) {
    const output = dossier.synthesized_output as Record<string, unknown>;
    const text = [
      (output.executive_summary as string) ?? '',
      (output.advocate_case as string) ?? '',
      (output.skeptic_case as string) ?? '',
      ...((output.key_findings as { finding?: string }[]) ?? []).map(f => f.finding ?? ''),
      ...((output.jaw_drop_layers as { content?: string }[]) ?? []).map(l => l.content ?? ''),
    ].join(' ');

    const matched = linkable
      .filter(p => text.toLowerCase().includes(p.full_name.toLowerCase()))
      .map(p => ({ person_id: p.id, topic_id: dossier.id, role: mapRole(p.credibility_tier) }));

    if (matched.length === 0) continue;

    await supabase.from('people_topics').upsert(matched, {
      onConflict: 'person_id,topic_id,role',
      ignoreDuplicates: true,
    });
    totalLinks += matched.length;
  }

  return { links_created: totalLinks, dossiers_scanned: dossiers?.length ?? 0 };
}

async function runBackfillFacts(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: people } = await supabase
    .from('people')
    .select('id, full_name, short_bio, born_date, died_date, nationality, born_location, current_role')
    .or('born_date.is.null,nationality.is.null,current_role.is.null')
    .limit(60); // cap to avoid timeout

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const person of people ?? []) {
    try {
      const context = person.short_bio ? `\nContext: ${person.short_bio}` : '';
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        temperature: 0,
        system: 'You are a biographical fact lookup service. Return ONLY valid JSON, no prose.',
        messages: [{
          role: 'user',
          content: `Person: ${person.full_name}${context}\n\nReturn: {"born_date":"...or null","born_location":"...or null","died_date":"...or null","nationality":"...or null","current_role":"...or null"}`,
        }],
      });

      const raw = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const facts = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim());

      const patch: Record<string, string> = {};
      if (!person.born_date && facts.born_date) patch.born_date = facts.born_date;
      if (!person.born_location && facts.born_location) patch.born_location = facts.born_location;
      if (!person.died_date && facts.died_date) patch.died_date = facts.died_date;
      if (!person.nationality && facts.nationality) patch.nationality = facts.nationality;
      if (!person.current_role && facts.current_role) patch.current_role = facts.current_role;

      if (Object.keys(patch).length === 0) { skipped++; continue; }

      await supabase.from('people').update(patch).eq('id', person.id);
      updated++;
    } catch {
      errors++;
    }
  }

  return { updated, skipped, errors, total: people?.length ?? 0 };
}

async function runEntityScan(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const [
    { data: existingPeople },
    { data: existingInstitutions },
    { data: dossiers },
  ] = await Promise.all([
    supabase.from('people').select('id, full_name'),
    supabase.from('institutions').select('id, name'),
    supabase.from('topic_dossiers')
      .select('id, title, synthesized_output')
      .eq('published', true)
      .not('synthesized_output', 'is', null),
  ]);

  const peopleMap = new Map((existingPeople ?? []).map(p => [normalizeName(p.full_name), p]));
  const instMap = new Map((existingInstitutions ?? []).map(i => [normalizeName(i.name), i]));

  let newPeople = 0;
  let newInstitutions = 0;
  let newLinks = 0;

  function mapPersonRole(tier: string) {
    const t = (tier ?? '').toLowerCase();
    if (t === 'whistleblower') return 'whistleblower';
    if (t === 'journalist') return 'journalist';
    if (t === 'historical_figure') return 'historical_figure';
    if (t === 'witness') return 'witness';
    if (t === 'academic' || t === 'independent_researcher') return 'researcher';
    return 'related';
  }

  for (const dossier of dossiers ?? []) {
    const text = buildDossierText(dossier.synthesized_output as Record<string, unknown>);

    let extracted: { people?: { name: string; credibility_tier: string; role_in_topic: string; relationship_to_topic: string }[]; institutions?: { name: string; common_name?: string; institution_type: string; role_in_topic: string; relationship_to_topic: string }[] };
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        temperature: 0,
        system: 'Extract named entities from research text. Return ONLY valid JSON.',
        messages: [{
          role: 'user',
          content: `Topic: "${dossier.title}"\n\nText:\n${text}\n\nReturn: {"people":[{"name":"...","credibility_tier":"academic|journalist|independent_researcher|whistleblower|public_figure|historical_figure|witness|unclassified","role_in_topic":"...","relationship_to_topic":"..."}],"institutions":[{"name":"...","common_name":"acronym or null","institution_type":"university|government_agency|military|intelligence|research_institute|corporation|ngo|foundation|secret_society|other","role_in_topic":"researcher|custodian|suppressor|classifier|publisher|funder|investigator|debunker|gatekeeper|related","relationship_to_topic":"..."}]}`,
        }],
      });
      const raw = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      extracted = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim());
    } catch {
      continue;
    }

    for (const p of extracted.people ?? []) {
      if (!p.name || p.name.length < 3) continue;
      const key = normalizeName(p.name);
      let personId: string | undefined;

      if (peopleMap.has(key)) {
        personId = peopleMap.get(key)!.id;
      } else {
        const { data: newPerson, error } = await supabase
          .from('people')
          .insert({
            slug: slugify(p.name),
            full_name: p.name,
            short_bio: p.relationship_to_topic ?? null,
            credibility_tier: p.credibility_tier ?? 'unclassified',
            key_positions: p.role_in_topic ? [p.role_in_topic] : null,
            status: 'published',
            extraction_notes: `Auto-extracted from gap scan of "${dossier.title}"`,
            ...buildExternalUrls(p.name),
          })
          .select('id').single();

        if (!error && newPerson) {
          personId = newPerson.id;
          peopleMap.set(key, { id: personId, full_name: p.name });
          newPeople++;
        } else if (error?.code === '23505') {
          const { data: ex } = await supabase.from('people').select('id').eq('slug', slugify(p.name)).single();
          personId = ex?.id;
        }
      }

      if (personId) {
        await supabase.from('people_topics').upsert(
          { person_id: personId, topic_id: dossier.id, role: mapPersonRole(p.credibility_tier), context: p.relationship_to_topic ?? null },
          { onConflict: 'person_id,topic_id,role', ignoreDuplicates: true }
        );
        newLinks++;
      }
    }

    for (const inst of extracted.institutions ?? []) {
      if (!inst.name || inst.name.length < 2) continue;
      const key = normalizeName(inst.name);
      const commonKey = inst.common_name ? normalizeName(inst.common_name) : null;
      let instId: string | undefined;

      if (instMap.has(key) || (commonKey && instMap.has(commonKey))) {
        instId = (instMap.get(key) ?? instMap.get(commonKey!))!.id;
      } else {
        const { data: newInst, error } = await supabase
          .from('institutions')
          .insert({
            slug: slugify(inst.name),
            name: inst.name,
            short_name: inst.common_name ?? null,
            institution_type: inst.institution_type ?? 'other',
            short_bio: inst.relationship_to_topic ?? null,
            status: 'published',
            extraction_notes: `Auto-extracted from gap scan of "${dossier.title}"`,
            ...buildExternalUrls(inst.name),
          })
          .select('id').single();

        if (!error && newInst) {
          instId = newInst.id;
          instMap.set(key, { id: instId, name: inst.name });
          if (commonKey) instMap.set(commonKey, { id: instId, name: inst.name });
          newInstitutions++;
        } else if (error?.code === '23505') {
          const { data: ex } = await supabase.from('institutions').select('id').eq('slug', slugify(inst.name)).single();
          instId = ex?.id;
        }
      }

      if (instId) {
        await supabase.from('institution_topics').upsert(
          { institution_id: instId, topic_id: dossier.id, role: inst.role_in_topic ?? 'related', context: inst.relationship_to_topic ?? null },
          { onConflict: 'institution_id,topic_id,role', ignoreDuplicates: true }
        );
        newLinks++;
      }
    }
  }

  return { new_people: newPeople, new_institutions: newInstitutions, new_links: newLinks, dossiers_scanned: dossiers?.length ?? 0 };
}

async function runEnrichProfiles(supabase: ReturnType<typeof createServerSupabaseClient>) {
  // Find people without bio sections
  const { data: withSections } = await supabase
    .from('people_bio_sections')
    .select('person_id');
  const hasSections = new Set((withSections ?? []).map((s: { person_id: string }) => s.person_id));

  const { data: people } = await supabase
    .from('people')
    .select('id, slug, full_name, short_bio, born_date, born_location, died_date, nationality, current_role, key_positions, credibility_tier')
    .eq('status', 'published')
    .limit(30); // cap per run to avoid timeout

  const toProcess = (people ?? []).filter(p => !hasSections.has(p.id));

  let enriched = 0;
  let skipped = 0;

  for (const person of toProcess) {
    // Get linked dossiers for context
    const { data: topicLinks } = await supabase
      .from('people_topics')
      .select('role, context, topic_dossiers!inner(title)')
      .eq('person_id', person.id)
      .eq('topic_dossiers.published', true)
      .limit(3);

    const topicContext = (topicLinks ?? [])
      .map((t: Record<string, unknown>) => {
        const td = t.topic_dossiers as Record<string, unknown>;
        return `- "${td.title}" (role: ${t.role})`;
      })
      .join('\n');

    const context = [
      `Name: ${person.full_name}`,
      `Credibility tier: ${person.credibility_tier ?? 'unclassified'}`,
      person.born_date ? `Born: ${person.born_date}${person.born_location ? ` in ${person.born_location}` : ''}` : '',
      person.died_date ? `Died: ${person.died_date}` : '',
      person.nationality ? `Nationality: ${person.nationality}` : '',
      person.current_role ? `Current role: ${person.current_role}` : '',
      person.key_positions?.length ? `Key positions: ${(person.key_positions as string[]).join('; ')}` : '',
      person.short_bio ? `\nKnown bio:\n${person.short_bio}` : '',
      topicContext ? `\nAppears in dossiers:\n${topicContext}` : '',
    ].filter(Boolean).join('\n');

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        temperature: 0.3,
        system: `You are writing factual profile sections for an investigative intelligence platform. Write in a direct, authoritative style. Dense with real facts. Each section 150-300 words. Use **bold** for key terms. Return ONLY valid JSON.`,
        messages: [{
          role: 'user',
          content: `Write bio sections for this person:\n\n${context}\n\nReturn: {"sections":[{"section_type":"overview","title":"Who They Are","content":"..."},{"section_type":"career","title":"Career & Work","content":"..."},{"section_type":"key_claims","title":"Positions & Views","content":"..."},{"section_type":"controversy","title":"Controversies & Criticism","content":"..."},{"section_type":"research_relevance","title":"Relevance to Alternative Research","content":"..."}]}\n\nIf too obscure to write factually, return {"sections":[]}`,
        }],
      });

      const raw = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim());
      const sections: { section_type: string; title: string; content: string }[] = parsed.sections ?? [];

      if (sections.length === 0) { skipped++; continue; }

      const rows = sections.map((s, i) => ({
        person_id: person.id,
        section_type: s.section_type,
        title: s.title,
        content: s.content,
        sort_order: i,
        agent_generated: true,
        manually_edited: false,
      }));

      await supabase.from('people_bio_sections').insert(rows);
      enriched++;
    } catch {
      skipped++;
    }
  }

  return { enriched, skipped, total_without_sections: toProcess.length };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { action } = await req.json();
  const supabase = createServerSupabaseClient();

  const validActions = ['backfill-links', 'backfill-topics', 'backfill-facts', 'scan-entities', 'enrich-profiles'];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  // Create a run record
  const { data: run, error: runErr } = await supabase
    .from('maintenance_runs')
    .insert({ action, status: 'running' })
    .select('id')
    .single();

  if (runErr || !run) {
    return NextResponse.json({ error: 'Failed to create run record' }, { status: 500 });
  }

  const runId = run.id;

  // Execute in background so we can return the runId immediately for fast actions,
  // or run inline for short operations
  if (action === 'backfill-links' || action === 'backfill-topics') {
    // Fast — run inline
    try {
      const summary = action === 'backfill-links'
        ? await runBackfillLinks(supabase)
        : await runBackfillTopics(supabase);
      await logRun(supabase, action, runId, summary);
      return NextResponse.json({ status: 'complete', runId, summary });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logError(supabase, runId, msg);
      return NextResponse.json({ status: 'failed', runId, error: msg }, { status: 500 });
    }
  }

  // Slow operations — fire in background, return runId for polling
  after(async () => {
    try {
      let summary;
      if (action === 'backfill-facts') summary = await runBackfillFacts(supabase);
      else if (action === 'scan-entities') summary = await runEntityScan(supabase);
      else summary = await runEnrichProfiles(supabase);
      await logRun(supabase, action, runId, summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logError(supabase, runId, msg);
    }
  });

  return NextResponse.json({ status: 'running', runId });
}
