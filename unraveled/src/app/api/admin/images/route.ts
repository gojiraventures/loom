/**
 * GET  /api/admin/images?topic=...
 *   Returns all images for a topic grouped by status.
 *
 * POST /api/admin/images
 *   Body: { topic, title }
 *   Searches Wikimedia Commons using Claude-generated queries and stores results.
 *
 * PATCH /api/admin/images
 *   Body: { id, status?, featured?, sort_order? }
 *   Approve, reject, or feature an image.
 *
 * DELETE /api/admin/images?id=...
 *   Remove an image record.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { queryClaude } from '@/lib/research/llm/claude';
import { searchWikimediaImages } from '@/lib/external/wikimedia-images';

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

export async function POST(req: NextRequest) {
  const { topic, title } = await req.json() as { topic: string; title: string };
  if (!topic || !title) return NextResponse.json({ error: 'topic and title required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Claude generates targeted Wikimedia Commons search queries
  const queryResponse = await queryClaude({
    provider: 'claude',
    systemPrompt: `You generate Wikimedia Commons image search queries for a research article. Return ONLY valid JSON — an array of 6 strings, each a targeted search query that will find high-quality, relevant, openly licensed images on Wikimedia Commons. Queries should target: archaeological sites, artifacts, maps, historical illustrations, geographic features, and cultural symbols related to the topic. Avoid generic terms. Be specific to maximize relevant results.`,
    userPrompt: `Article topic: "${topic}"
Article title: "${title}"

Generate 6 targeted Wikimedia Commons search queries. Each should find different aspects of the topic.

Return ONLY: ["query 1", "query 2", "query 3", "query 4", "query 5", "query 6"]`,
    jsonMode: true,
    maxTokens: 512,
    temperature: 0.3,
  });

  let queries: string[] = [];
  try {
    const parsed = JSON.parse(queryResponse.text);
    queries = Array.isArray(parsed) ? parsed : Object.values(parsed)[0] as string[];
  } catch {
    // Fallback: use topic words as queries
    queries = [topic, title].slice(0, 2);
  }

  // Search Wikimedia Commons for each query and collect results
  const allImages = await Promise.all(
    queries.map((q) => searchWikimediaImages(q, 12).catch(() => []))
  );

  // Flatten, deduplicate by image_url, keep top 40 by quality
  const seen = new Set<string>();
  const deduped = allImages
    .flatMap((imgs, qi) => imgs.map((img) => ({ ...img, search_query: queries[qi] })))
    .filter((img) => {
      if (seen.has(img.image_url)) return false;
      seen.add(img.image_url);
      return true;
    })
    .sort((a, b) => b.quality_score - a.quality_score)
    .slice(0, 40);

  if (deduped.length === 0) {
    return NextResponse.json({ ok: true, found: 0, message: 'No images found for this topic' });
  }

  // Upsert into topic_images (skip on conflict = don't overwrite approved images)
  const rows = deduped.map((img) => ({
    topic,
    source: 'wikimedia',
    search_query: img.search_query,
    title: img.title,
    description: img.description,
    image_url: img.image_url,
    thumbnail_url: img.thumbnail_url,
    source_page_url: img.source_page_url,
    license: img.license,
    license_url: img.license_url,
    attribution: img.attribution,
    author: img.author,
    date_created: img.date_created,
    width: img.width,
    height: img.height,
    mime_type: img.mime_type,
    quality_score: img.quality_score,
    status: 'suggested',
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('topic_images')
    .upsert(rows, { onConflict: 'topic,image_url', ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, found: deduped.length, queries });
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
