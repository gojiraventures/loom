/**
 * GET  /api/admin/images?topic=...
 *   Returns all non-rejected images for a topic, sorted by featured + quality.
 *
 * POST /api/admin/images
 *   Body: { topic, title }
 *   Searches Wikimedia Commons, Met Museum, and Cleveland Museum of Art.
 *   Claude generates source-targeted queries. Visual Curator (Gemini) evaluates
 *   all candidates before storage — junk auto-rejected.
 *
 * PATCH /api/admin/images
 *   Body: { id, status?, featured?, sort_order? }
 *
 * DELETE /api/admin/images?id=...
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { queryClaude } from '@/lib/research/llm/claude';
import { searchWikimediaImages } from '@/lib/external/wikimedia-images';
import { searchMetMuseumImages } from '@/lib/external/met-museum-images';
import { searchClevelandMuseumImages } from '@/lib/external/cleveland-museum-images';
import { searchLocImages } from '@/lib/external/loc-images';
import { searchSmithsonianImages } from '@/lib/external/smithsonian-images';
import { searchDavidRumseyImages } from '@/lib/external/david-rumsey-images';
import { evaluateImagesForTopic } from '@/lib/external/gemini-image-eval';
import type { WikimediaImage } from '@/lib/external/wikimedia-images';

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const topic = new URL(req.url).searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('topic_images')
    .select('*')
    .eq('topic', topic)
    .neq('status', 'rejected')
    .order('featured', { ascending: false })
    .order('quality_score', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────

interface QuerySet {
  wikimedia: string[];
  museum: string[];
  map: string[];
}

export async function POST(req: NextRequest) {
  const { topic, title } = await req.json() as { topic: string; title: string };
  if (!topic || !title) return NextResponse.json({ error: 'topic and title required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Claude generates three sets of queries targeted at each source type.
  // IMPORTANT: museum and map queries must be SHORT direct keywords (1–3 words).
  // Museum collection search engines (Met, SI, Cleveland) return far more results
  // from "dragon" or "flood myth" than from compound descriptive phrases.
  const queryResponse = await queryClaude({
    provider: 'claude',
    systemPrompt: `You generate image search queries for a research article across three source types.

CRITICAL RULE for "museum" and "map" queries: use SHORT, DIRECT keywords (1–3 words max).
Museum collection search engines return far more results from "dragon" than "ancient Chinese dragon deity bronze sculpture".
Bad: "Mesopotamian flood narrative cuneiform tablet relief"
Good: "flood myth", "deluge tablet", "Noah ark"

1. wikimedia: 4 documentary queries — sites, maps, photos, diagrams. Can be 2–5 words.
2. museum: 4 SHORT artifact/art keywords — sculptures, pottery, paintings, iconography. 1–3 words each.
3. map: 4 SHORT historical map keywords — for David Rumsey map archive. 1–3 words each. Think: "dragon vein", "ancient flood", "ley line", "world map", "sacred geometry".

Return ONLY valid JSON: { "wikimedia": ["q1","q2","q3","q4"], "museum": ["q1","q2","q3","q4"], "map": ["q1","q2","q3","q4"] }`,
    userPrompt: `Article topic: "${topic}"
Article title: "${title}"

Generate search queries. Museum and map queries must be SHORT (1–3 words).

Return ONLY: { "wikimedia": [...], "museum": [...], "map": [...] }`,
    jsonMode: true,
    maxTokens: 512,
    temperature: 0.3,
  });

  let querySet: QuerySet = { wikimedia: [], museum: [], map: [] };
  try {
    const parsed = JSON.parse(queryResponse.text) as Record<string, unknown>;
    querySet.wikimedia = Array.isArray(parsed.wikimedia) ? parsed.wikimedia as string[] : [topic];
    querySet.museum = Array.isArray(parsed.museum) ? parsed.museum as string[] : [topic];
    querySet.map = Array.isArray(parsed.map) ? parsed.map as string[] : [topic];
  } catch {
    querySet = { wikimedia: [topic, title], museum: [topic], map: [topic] };
  }

  // Fan out to all five sources in parallel
  const [wikimediaResults, metResults, clevelandResults, locResults, smithsonianResults, rumseyResults] = await Promise.all([
    Promise.all(
      querySet.wikimedia.map((q) => searchWikimediaImages(q, 10).catch(() => [] as WikimediaImage[]))
    ).then((res) => res.flatMap((imgs, i) => imgs.map((img) => ({ ...img, search_query: querySet.wikimedia[i], _source: 'wikimedia' })))),

    Promise.all(
      querySet.museum.map((q) => searchMetMuseumImages(q, 8).catch(() => []))
    ).then((res) => res.flatMap((imgs) => imgs.map((img) => ({ ...img, _source: 'met_museum' })))),

    Promise.all(
      querySet.museum.map((q) => searchClevelandMuseumImages(q, 8).catch(() => []))
    ).then((res) => res.flatMap((imgs) => imgs.map((img) => ({ ...img, _source: 'cleveland_museum' })))),

    Promise.all(
      querySet.map.map((q) => searchLocImages(q, 6).catch(() => []))
    ).then((res) => res.flatMap((imgs) => imgs.map((img) => ({ ...img, _source: 'loc' })))),

    Promise.all(
      querySet.museum.map((q) => searchSmithsonianImages(q, 6).catch(() => []))
    ).then((res) => res.flatMap((imgs) => imgs.map((img) => ({ ...img, _source: 'smithsonian' })))),

    Promise.all(
      querySet.map.map((q) => searchDavidRumseyImages(q, 6).catch(() => []))
    ).then((res) => res.flatMap((imgs) => imgs.map((img) => ({ ...img, _source: 'david_rumsey' })))),
  ]);

  // Deduplicate by image_url across all sources, keep top 60 by quality
  const seen = new Set<string>();
  const deduped = [...wikimediaResults, ...metResults, ...clevelandResults, ...locResults, ...smithsonianResults, ...rumseyResults]
    .filter((img) => {
      if (!img.image_url || seen.has(img.image_url)) return false;
      seen.add(img.image_url);
      return true;
    })
    .sort((a, b) => b.quality_score - a.quality_score)
    .slice(0, 60);

  if (deduped.length === 0) {
    return NextResponse.json({ ok: true, found: 0, message: 'No images found across any source' });
  }

  // Visual Curator (Gemini vision): structured verdict + auto-reject junk
  const evaluated = await evaluateImagesForTopic(deduped, topic, title).catch(() =>
    deduped.map((img) => ({
      ...img,
      gemini_verdict: null,
      gemini_aesthetic_score: null,
      gemini_literal: null,
      gemini_alignment: null,
      gemini_caption: null,
      gemini_tweaks: null,
      gemini_alternatives: null,
      gemini_rejected: false,
    }))
  );

  const passedImages = evaluated.filter((img) => !img.gemini_rejected);
  const rejectedImages = evaluated.filter((img) => img.gemini_rejected);

  type WithSource = typeof evaluated[0] & { _source?: string };
  const getSource = (img: WithSource) => img._source ?? 'wikimedia';

  // Upsert (skip on conflict = don't overwrite admin decisions)
  const rows = evaluated.map((img) => ({
    topic,
    source: getSource(img),
    search_query: img.search_query ?? null,
    title: img.title,
    description: img.description ?? img.gemini_literal,
    image_url: img.image_url,
    thumbnail_url: img.thumbnail_url,
    source_page_url: img.source_page_url,
    license: img.license,
    license_url: img.license_url,
    attribution: img.attribution,
    author: img.author,
    date_created: img.date_created,
    width: img.width || null,
    height: img.height || null,
    mime_type: img.mime_type,
    quality_score: img.quality_score,
    status: img.gemini_rejected ? 'rejected' : 'suggested',
    gemini_verdict: img.gemini_verdict,
    gemini_aesthetic_score: img.gemini_aesthetic_score,
    gemini_literal: img.gemini_literal,
    gemini_alignment: img.gemini_alignment,
    gemini_caption: img.gemini_caption,
    gemini_tweaks: img.gemini_tweaks,
    gemini_alternatives: img.gemini_alternatives,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('topic_images')
    .upsert(rows, { onConflict: 'topic,image_url', ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sourceCounts = {
    wikimedia: passedImages.filter((i) => getSource(i) === 'wikimedia').length,
    met_museum: passedImages.filter((i) => getSource(i) === 'met_museum').length,
    cleveland_museum: passedImages.filter((i) => getSource(i) === 'cleveland_museum').length,
    loc: passedImages.filter((i) => getSource(i) === 'loc').length,
    smithsonian: passedImages.filter((i) => getSource(i) === 'smithsonian').length,
    david_rumsey: passedImages.filter((i) => getSource(i) === 'david_rumsey').length,
  };

  return NextResponse.json({
    ok: true,
    found: passedImages.length,
    rejected: rejectedImages.length,
    sources: sourceCounts,
    queries: querySet,
  });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; status?: string; featured?: boolean; sort_order?: number };
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('topic_images')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('topic_images').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
