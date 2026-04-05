/**
 * Phase 0 — Topic Intelligence Gatherer
 *
 * Runs before any research agents. Parallel-fetches:
 *   - Reddit: subreddits, top posts, controversial posts, cited external links
 *   - YouTube: videos ranked by quality score
 *   - Podcasts: iTunes + Listen Notes episodes
 *   - Wikipedia: article summary, disputed status, talk page flags
 *
 * Then uses Claude to synthesize discourse into:
 *   - Discourse clusters (what themes are people discussing?)
 *   - Rabbit holes (specific names, books, claims that keep appearing)
 *   - Auto-generated research questions weighted by community interest
 *
 * Stores everything in topic_media + topic_intelligence tables.
 */

import { searchSubreddits, searchPosts, getControversialPosts, extractCitedLinks } from '@/lib/external/reddit';
import { searchYouTube } from '@/lib/external/youtube';
import { searchPodcasts } from '@/lib/external/podcasts';
import { getWikipediaSummary } from '@/lib/external/wikipedia';
import { createServerSupabaseClient } from '@/lib/supabase';
import { route } from '@/lib/research/llm/router';
import { parseJsonResponse } from '@/lib/research/llm/parse';
import { validateMediaUrl } from '@/lib/media/validate-url';

export interface RabbitHole {
  name: string;
  type: 'person' | 'book' | 'claim' | 'institution' | 'event' | 'document' | 'site';
  weight: number;      // 0–100, based on frequency and upvote signal
  description: string;
  sourceUrls: string[];
}

export interface DiscourseCluster {
  theme: string;
  sentiment: 'believers' | 'skeptics' | 'mixed' | 'researchers';
  postCount: number;
  topQuotes: string[];
  rabbitHoles: string[]; // names from the rabbit holes list
}

export interface TopicIntelligence {
  topic: string;
  subreddits: { name: string; subscribers: number; description: string; url: string }[];
  discourseClusters: DiscourseCluster[];
  rabbitHoles: RabbitHole[];
  citedLinks: { url: string; title: string; count: number }[];
  autoQuestions: string[];
  wikipediaSummary: string | null;
  wikipediaDisputed: boolean;
  wikipediaTalkFlags: string[];
  youtubeCount: number;
  podcastCount: number;
}

async function synthesizeDiscourse(
  topic: string,
  posts: { title: string; selftext: string; score: number; subreddit: string; upvoteRatio: number }[],
  controversialPosts: { title: string; score: number }[],
): Promise<{ clusters: DiscourseCluster[]; rabbitHoles: RabbitHole[]; questions: string[] }> {
  const postSample = posts
    .slice(0, 30)
    .map((p) => `[r/${p.subreddit}] score:${p.score} ratio:${p.upvoteRatio.toFixed(2)}\nTitle: ${p.title}\n${p.selftext ? p.selftext.slice(0, 200) : ''}`)
    .join('\n---\n');

  const controversialSample = controversialPosts
    .slice(0, 15)
    .map((p) => `- ${p.title} (score: ${p.score})`)
    .join('\n');

  const prompt = `You are analyzing Reddit discourse about: "${topic}"

TOP POSTS:
${postSample}

CONTROVERSIAL POSTS (community is divided):
${controversialSample}

Analyze this discourse and return ONLY valid JSON:
{
  "clusters": [
    {
      "theme": "Short theme name",
      "sentiment": "believers|skeptics|mixed|researchers",
      "postCount": estimated number,
      "topQuotes": ["notable phrase or claim from posts", "another notable claim"],
      "rabbitHoles": ["specific name or claim that keeps appearing"]
    }
  ],
  "rabbitHoles": [
    {
      "name": "Specific name, book title, institution, or claim",
      "type": "person|book|claim|institution|event|document|site",
      "weight": 0-100,
      "description": "Why this keeps appearing and what people claim about it",
      "sourceUrls": []
    }
  ],
  "questions": [
    "Specific researchable question surfaced by the discourse — one that the community cares about but hasn't answered rigorously"
  ]
}

Rules:
- Identify 3–6 discourse clusters
- Identify 5–15 rabbit holes (specific names, books, institutions — not vague themes)
- Generate 5–10 research questions that a serious researcher should investigate based on what the community is asking
- Weight rabbit holes by how often they appear and how many upvotes the posts mentioning them have
- Be specific: "Aleš Hrdlička" not "Smithsonian scientists"`;

  try {
    const response = await route({
      provider: 'claude',
      systemPrompt: 'You are a discourse analyst. Return only valid JSON.',
      userPrompt: prompt,
      jsonMode: true,
      maxTokens: 4096,
      temperature: 0.3,
    }, 'intelligence-gatherer');

    const raw = parseJsonResponse(response) as Record<string, unknown>;
    return {
      clusters: (raw.clusters ?? []) as DiscourseCluster[],
      rabbitHoles: (raw.rabbitHoles ?? []) as RabbitHole[],
      questions: (raw.questions ?? []) as string[],
    };
  } catch (err) {
    console.error('[intelligence] discourse synthesis failed:', err);
    return { clusters: [], rabbitHoles: [], questions: [] };
  }
}

export async function gatherTopicIntelligence(topic: string): Promise<TopicIntelligence> {
  console.log(`[intelligence] Starting Phase 0 for: "${topic}"`);

  // Run all external fetches in parallel
  const [subreddits, topPosts, controversialPosts, youtubeVideos, podcasts, wikipedia] = await Promise.all([
    searchSubreddits(topic, 8),
    searchPosts(topic, { sort: 'top', limit: 25, time: 'all' }),
    getControversialPosts(topic, 15),
    searchYouTube(`${topic} documentary evidence research`, 20),
    searchPodcasts(topic),
    getWikipediaSummary(topic),
  ]);

  console.log(`[intelligence] Got: ${subreddits.length} subreddits, ${topPosts.length} posts, ${youtubeVideos.length} videos, ${podcasts.length} podcasts`);

  // Extract external links cited in Reddit posts
  const citedLinks = extractCitedLinks([...topPosts, ...controversialPosts]);

  // Synthesize discourse with Claude
  const { clusters, rabbitHoles, questions } = await synthesizeDiscourse(topic, topPosts, controversialPosts);

  // Store to Supabase
  const supabase = createServerSupabaseClient();

  // Upsert intelligence record
  await supabase.from('topic_intelligence').upsert({
    topic,
    subreddits: subreddits.map((s) => ({
      name: s.name,
      subscribers: s.subscribers,
      description: s.publicDescription,
      url: s.url,
    })),
    discourse_clusters: clusters,
    rabbit_holes: rabbitHoles,
    cited_links: citedLinks,
    auto_questions: questions,
    wikipedia_summary: wikipedia?.extract ?? null,
    wikipedia_disputed_sections: wikipedia?.disputed ? ['Article marked as disputed'] : [],
    wikipedia_talk_flags: wikipedia?.talkFlags ?? [],
    raw_reddit_data: { topPosts: topPosts.slice(0, 10), controversialPosts: controversialPosts.slice(0, 5) },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'topic' });

  // Store YouTube videos — validate each before inserting
  if (youtubeVideos.length > 0) {
    const validatedYoutube = (
      await Promise.all(
        youtubeVideos.map(async (v) => {
          const check = await validateMediaUrl(v.watchUrl, 'youtube');
          if (!check.valid) {
            console.warn(`[gatherer] Skipping dead YouTube video: ${v.watchUrl} — ${check.reason}`);
            return null;
          }
          return v;
        })
      )
    ).filter(Boolean) as typeof youtubeVideos;

    if (validatedYoutube.length > 0) {
    await supabase.from('topic_media').upsert(
      validatedYoutube.map((v) => ({
        topic,
        type: 'youtube',
        title: v.title,
        description: v.description?.slice(0, 500) ?? '',
        url: v.watchUrl,
        embed_url: v.embedUrl,
        thumbnail_url: v.thumbnailUrl,
        channel_name: v.channelName,
        channel_url: `https://youtube.com/channel/${v.channelId}`,
        channel_subscriber_count: v.channelSubscriberCount,
        view_count: v.viewCount,
        like_count: v.likeCount,
        comment_count: v.commentCount,
        duration_seconds: v.durationSeconds,
        published_at: v.publishedAt || null,
        quality_score: v.qualityScore,
        relevance_score: v.qualityScore,
        metadata: { videoId: v.videoId },
      })),
      { onConflict: 'url' }
    ).then(() => null, () => null);
    }
  }

  // Store podcast episodes — validate each before inserting
  if (podcasts.length > 0) {
    const validatedPodcasts = (
      await Promise.all(
        podcasts.map(async (p) => {
          const check = await validateMediaUrl(p.episodeUrl, 'podcast');
          if (!check.valid) {
            console.warn(`[gatherer] Skipping dead podcast: ${p.episodeUrl} — ${check.reason}`);
            return null;
          }
          return p;
        })
      )
    ).filter(Boolean) as typeof podcasts;

    if (validatedPodcasts.length > 0) {
    await supabase.from('topic_media').upsert(
      validatedPodcasts.map((p) => ({
        topic,
        type: 'podcast',
        title: p.title,
        description: p.description,
        url: p.episodeUrl,
        embed_url: p.embedUrl,
        thumbnail_url: p.thumbnailUrl,
        channel_name: p.showName,
        channel_url: p.showUrl,
        duration_seconds: p.durationSeconds,
        published_at: p.publishedAt || null,
        quality_score: 0.5,
        relevance_score: 0.5,
        metadata: { source: p.source },
      })),
      { onConflict: 'url' }
    ).then(() => null, () => null);
    }
  }

  return {
    topic,
    subreddits: subreddits.map((s) => ({ name: s.name, subscribers: s.subscribers, description: s.publicDescription, url: s.url })),
    discourseClusters: clusters,
    rabbitHoles,
    citedLinks,
    autoQuestions: questions,
    wikipediaSummary: wikipedia?.extract ?? null,
    wikipediaDisputed: wikipedia?.disputed ?? false,
    wikipediaTalkFlags: wikipedia?.talkFlags ?? [],
    youtubeCount: youtubeVideos.length,
    podcastCount: podcasts.length,
  };
}

export async function getStoredIntelligence(topic: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('topic_intelligence')
    .select()
    .eq('topic', topic)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getTopicMedia(topic: string, type?: string, approvedOnly = true) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('topic_media')
    .select()
    .eq('topic', topic)
    .order('quality_score', { ascending: false });
  if (approvedOnly) query = query.eq('approved', true);
  if (type) query = query.eq('type', type);
  const { data } = await query;
  return data ?? [];
}

export async function approveMedia(id: string, featured = false) {
  const supabase = createServerSupabaseClient();
  await supabase.from('topic_media').update({ approved: true, featured }).eq('id', id);
}
