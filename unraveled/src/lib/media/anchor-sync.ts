/**
 * Anchor Media Sync
 *
 * Syncs the curated ANCHOR_MEDIA seed list to the topic_media table.
 * Called at publish time and from the admin API.
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import { ANCHOR_MEDIA, getAnchorsForTopic, type AnchorMediaSeed } from './anchor-seed';

function seedToRow(seed: AnchorMediaSeed, topic: string) {
  return {
    topic,
    anchor_key: seed.anchor_key,
    type: seed.type === 'spotify_podcast' ? 'podcast' : seed.type,
    title: seed.title,
    description: seed.description,
    url: seed.url,
    embed_url: seed.embed_url,
    thumbnail_url: seed.thumbnail_url,
    channel_name: seed.channel_name,
    channel_url: seed.channel_url,
    channel_subscriber_count: seed.channel_subscriber_count,
    view_count: seed.view_count,
    duration_seconds: seed.duration_seconds,
    published_at: seed.published_at,
    quality_score: seed.featured ? 0.95 : 0.8,
    relevance_score: seed.featured ? 0.95 : 0.8,
    approved: seed.approved,
    featured: seed.featured,
    is_anchor: true,
    sort_order: seed.sort_order,
    guest_names: seed.guest_names,
    key_claims: seed.key_claims,
    timestamp_markers: seed.timestamp_markers,
    metadata: {
      anchor_key: seed.anchor_key,
      source: seed.type,
      tags: seed.tags,
    },
  };
}

/**
 * Sync all anchors that match a topic into topic_media.
 * Safe to call multiple times — uses upsert on anchor_key.
 */
export async function syncAnchorsForTopic(topic: string): Promise<number> {
  const anchors = getAnchorsForTopic(topic);
  if (anchors.length === 0) return 0;

  const supabase = createServerSupabaseClient();
  const rows = anchors.map((a) => seedToRow(a, topic));

  const { error } = await supabase
    .from('topic_media')
    .upsert(rows, { onConflict: 'anchor_key' });

  if (error) {
    console.error('[anchor-sync] upsert failed:', error.message);
    throw error;
  }

  console.log(`[anchor-sync] Synced ${rows.length} anchors for topic: "${topic}"`);
  return rows.length;
}

/**
 * Sync ALL anchor media seeds across ALL topics.
 * Used by the admin "Sync All Anchors" button.
 */
export async function syncAllAnchors(): Promise<{ synced: number; topics: string[] }> {
  // Collect all unique topic strings referenced across seeds
  const topicSet = new Set<string>();
  for (const seed of ANCHOR_MEDIA) {
    for (const t of seed.topics) topicSet.add(t);
  }

  const supabase = createServerSupabaseClient();
  let totalSynced = 0;
  const syncedTopics: string[] = [];

  for (const topic of topicSet) {
    const anchors = getAnchorsForTopic(topic);
    if (anchors.length === 0) continue;

    const rows = anchors.map((a) => seedToRow(a, topic));
    const { error } = await supabase
      .from('topic_media')
      .upsert(rows, { onConflict: 'anchor_key' });

    if (!error) {
      totalSynced += rows.length;
      syncedTopics.push(topic);
    }
  }

  return { synced: totalSynced, topics: syncedTopics };
}

/**
 * Get all anchor media for a topic (from DB, already synced).
 */
export async function getAnchorMediaForTopic(topic: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('topic_media')
    .select()
    .eq('topic', topic)
    .eq('is_anchor', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}
