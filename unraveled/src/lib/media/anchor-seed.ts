/**
 * Curated Anchor Media Registry
 *
 * These are the "crown jewels" — high-value episodes, documentaries, and videos
 * that are manually curated and auto-attached to topics when they publish.
 *
 * SPOTIFY EPISODE IDs:
 * Find these by opening the episode on Spotify web, sharing → Copy Episode Link.
 * Format: https://open.spotify.com/episode/{ID}
 * Embed: https://open.spotify.com/embed/episode/{ID}
 *
 * ADDING NEW ENTRIES:
 * - anchor_key must be unique (kebab-case, stable identifier)
 * - topics: array of internal topic keys (must match topic_dossiers.topic)
 * - tags: used for fuzzy topic matching when new topics are created
 * - sort_order: lower = shown first (10 = featured top, 50 = standard, 100 = background)
 */

export interface AnchorMediaSeed {
  anchor_key: string;
  type: 'youtube' | 'spotify_podcast' | 'podcast' | 'documentary';
  title: string;
  description: string;
  url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  channel_name: string;
  channel_url: string | null;
  guest_names: string[];
  key_claims: { claim: string; timestamp?: string }[];
  timestamp_markers: { time: string; description: string }[];
  published_at: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  channel_subscriber_count: number | null;
  topics: string[];
  tags: string[];
  sort_order: number;
  approved: boolean;
  featured: boolean;
}

export const ANCHOR_MEDIA: AnchorMediaSeed[] = [

  // ── Joe Rogan Experience ─────────────────────────────────────────────────────

  {
    anchor_key: 'jre-2151-graham-hancock',
    type: 'spotify_podcast',
    title: 'Joe Rogan Experience #2151 — Graham Hancock',
    description: 'Hancock\'s most recent JRE appearance, covering America Before, the Younger Dryas impact, Göbekli Tepe, and the evidence for a pre-12,000 BCE advanced civilization. Released after Netflix\'s Ancient Apocalypse.',
    url: 'https://open.spotify.com/episode/2vPYpGHheFJoZFAMhfFlOV',
    embed_url: 'https://open.spotify.com/embed/episode/2vPYpGHheFJoZFAMhfFlOV',
    thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a0af9f9adb78cf8c89b40a83d',
    channel_name: 'Joe Rogan Experience',
    channel_url: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
    guest_names: ['Graham Hancock'],
    key_claims: [
      { claim: 'Comet impact circa 12,900 BCE caused catastrophic civilizational collapse', timestamp: '0:18:00' },
      { claim: 'Göbekli Tepe predates Sumerian civilization by 6,000 years', timestamp: '0:42:00' },
      { claim: 'Sphinx water erosion evidence suggests construction before 10,500 BCE', timestamp: '1:15:00' },
      { claim: 'Ancient Maps (Piri Reis) show Antarctic coastline pre-discovery', timestamp: '2:10:00' },
    ],
    timestamp_markers: [
      { time: '0:15:00', description: 'Younger Dryas impact hypothesis overview' },
      { time: '0:40:00', description: 'Göbekli Tepe and its implications' },
      { time: '1:10:00', description: 'Sphinx water erosion debate' },
      { time: '2:05:00', description: 'Maps of ancient sea kings' },
      { time: '2:45:00', description: 'America Before — pre-Clovis evidence' },
    ],
    published_at: '2023-11-16',
    duration_seconds: 11160,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['global flood', 'lost civilizations', 'catastrophism', 'ancient technology'],
    tags: ['hancock', 'younger dryas', 'lost civilization', 'göbekli tepe', 'catastrophe', 'ancient maps'],
    sort_order: 10,
    approved: true,
    featured: true,
  },

  {
    anchor_key: 'jre-1543-hancock-carlson',
    type: 'spotify_podcast',
    title: 'Joe Rogan Experience #1543 — Graham Hancock & Randall Carlson',
    description: 'The landmark episode that brought lost civilization and catastrophism to mainstream audiences. Hancock and Carlson debate the evidence together, covering Younger Dryas impact, flood mythology, and the missing civilization hypothesis.',
    url: 'https://open.spotify.com/episode/3Wn7MlOGRSMXdZuMrJ5bqQ',
    embed_url: 'https://open.spotify.com/embed/episode/3Wn7MlOGRSMXdZuMrJ5bqQ',
    thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a0af9f9adb78cf8c89b40a83d',
    channel_name: 'Joe Rogan Experience',
    channel_url: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
    guest_names: ['Graham Hancock', 'Randall Carlson'],
    key_claims: [
      { claim: 'Platinum spike in ice cores at 12,900 BCE indicates extraterrestrial impact', timestamp: '0:35:00' },
      { claim: 'Younger Dryas Boundary layer found across four continents', timestamp: '0:50:00' },
      { claim: 'Flood mythology from 200+ cultures encodes memory of real sea level rise', timestamp: '1:30:00' },
    ],
    timestamp_markers: [
      { time: '0:30:00', description: 'Younger Dryas impact evidence — Randall Carlson' },
      { time: '1:25:00', description: 'Global flood myths as encoded history' },
      { time: '2:00:00', description: 'Gobekli Tepe\'s builder civilization' },
    ],
    published_at: '2020-09-29',
    duration_seconds: 14400,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['global flood', 'lost civilizations', 'catastrophism'],
    tags: ['hancock', 'carlson', 'younger dryas', 'flood', 'lost civilization', 'impact', 'ice age'],
    sort_order: 10,
    approved: true,
    featured: true,
  },

  {
    anchor_key: 'jre-1124-graham-hancock',
    type: 'spotify_podcast',
    title: 'Joe Rogan Experience #1124 — Graham Hancock',
    description: 'Hancock discusses Fingerprints of the Gods, the evidence for an antediluvian civilization, consciousness research, and the suppression of alternative archaeology.',
    url: 'https://open.spotify.com/episode/5jdPxRZyHXoJFpJGWFPFRq',
    embed_url: 'https://open.spotify.com/embed/episode/5jdPxRZyHXoJFpJGWFPFRq',
    thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a0af9f9adb78cf8c89b40a83d',
    channel_name: 'Joe Rogan Experience',
    channel_url: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
    guest_names: ['Graham Hancock'],
    key_claims: [
      { claim: 'Mainstream archaeology ignores evidence inconvenient to established timelines', timestamp: '0:25:00' },
      { claim: 'Angkor Wat and the Giza pyramids encode precession of the equinoxes', timestamp: '1:05:00' },
    ],
    timestamp_markers: [
      { time: '0:20:00', description: 'Fingerprints of the Gods revisited' },
      { time: '1:00:00', description: 'Astronomical alignments in ancient structures' },
    ],
    published_at: '2018-08-17',
    duration_seconds: 9360,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['global flood', 'lost civilizations'],
    tags: ['hancock', 'lost civilization', 'ancient egypt', 'precession', 'angkor'],
    sort_order: 20,
    approved: true,
    featured: false,
  },

  {
    anchor_key: 'jre-725-randall-carlson',
    type: 'spotify_podcast',
    title: 'Joe Rogan Experience #725 — Randall Carlson',
    description: 'Carlson\'s breakout JRE appearance. Deep dive into Missoula Floods, cosmic cycles, Younger Dryas catastrophe, and the geological evidence for a civilization-ending impact event.',
    url: 'https://open.spotify.com/episode/66aTM5RvAbeGdPz5f7cPgd',
    embed_url: 'https://open.spotify.com/embed/episode/66aTM5RvAbeGdPz5f7cPgd',
    thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a0af9f9adb78cf8c89b40a83d',
    channel_name: 'Joe Rogan Experience',
    channel_url: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
    guest_names: ['Randall Carlson'],
    key_claims: [
      { claim: 'Lake Missoula megaflood created Channeled Scablands in days, not millennia', timestamp: '0:45:00' },
      { claim: 'Cosmic cycle of ~26,000 years correlates with civilizational collapse events', timestamp: '1:20:00' },
    ],
    timestamp_markers: [
      { time: '0:40:00', description: 'Missoula megaflood geology evidence' },
      { time: '1:15:00', description: 'Cosmic cycle and catastrophe correlation' },
      { time: '2:00:00', description: 'Ice age sea level changes and lost coastlines' },
    ],
    published_at: '2015-12-04',
    duration_seconds: 12600,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['global flood', 'catastrophism'],
    tags: ['carlson', 'younger dryas', 'flood', 'geology', 'missoula', 'catastrophe', 'cosmic cycles'],
    sort_order: 15,
    approved: true,
    featured: true,
  },

  {
    anchor_key: 'jre-1897-michael-heiser',
    type: 'spotify_podcast',
    title: 'Joe Rogan Experience #1897 — Michael Heiser',
    description: 'Biblical scholar Michael Heiser (PhD Hebrew Bible) discusses the Nephilim, the Divine Council, the sons of God in Genesis 6, and what the ancient Israelites actually believed about supernatural beings.',
    url: 'https://open.spotify.com/episode/5NbHtNbvf1zXbVv7mfqH9t',
    embed_url: 'https://open.spotify.com/embed/episode/5NbHtNbvf1zXbVv7mfqH9t',
    thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a0af9f9adb78cf8c89b40a83d',
    channel_name: 'Joe Rogan Experience',
    channel_url: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
    guest_names: ['Michael Heiser'],
    key_claims: [
      { claim: 'Nephilim in Hebrew means "fallen ones" — the term predates the angel interpretation', timestamp: '0:30:00' },
      { claim: 'Divine Council worldview was mainstream ancient Israelite theology, not heresy', timestamp: '1:00:00' },
      { claim: 'Book of Enoch was considered scripture by the Dead Sea Scrolls community', timestamp: '1:45:00' },
    ],
    timestamp_markers: [
      { time: '0:25:00', description: 'What Nephilim actually means in Hebrew' },
      { time: '0:55:00', description: 'The Divine Council in Psalm 82 and Deuteronomy 32' },
      { time: '1:40:00', description: 'Book of Enoch and the Watchers' },
    ],
    published_at: '2022-12-12',
    duration_seconds: 10800,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['watchers nephilim', 'biblically accurate angels'],
    tags: ['nephilim', 'watchers', 'heiser', 'biblical', 'enoch', 'divine council', 'angels', 'giants'],
    sort_order: 10,
    approved: true,
    featured: true,
  },

  // ── YouTube — Documentaries & Lectures ───────────────────────────────────────

  {
    anchor_key: 'yt-ancient-apocalypse-ep1',
    type: 'youtube',
    title: 'Ancient Apocalypse — Episode 1: Stranger in a Time of Chaos (Netflix Official Clip)',
    description: 'Graham Hancock investigates Göbekli Tepe in the series that sparked a major debate between archaeologists and alternative historians.',
    url: 'https://www.youtube.com/watch?v=ZXECOUGVLaU',
    embed_url: 'https://www.youtube.com/embed/ZXECOUGVLaU',
    thumbnail_url: null,
    channel_name: 'Netflix',
    channel_url: 'https://www.youtube.com/netflix',
    guest_names: ['Graham Hancock'],
    key_claims: [
      { claim: 'Göbekli Tepe was built by an unknown civilization 11,600 years ago', timestamp: '0:08:00' },
    ],
    timestamp_markers: [],
    published_at: '2022-11-11',
    duration_seconds: 2700,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['lost civilizations', 'global flood', 'catastrophism'],
    tags: ['hancock', 'göbekli tepe', 'ancient apocalypse', 'netflix', 'lost civilization'],
    sort_order: 20,
    approved: true,
    featured: false,
  },

  {
    anchor_key: 'yt-randall-carlson-younger-dryas',
    type: 'youtube',
    title: 'The Great Cosmic Reset — Randall Carlson Full Lecture',
    description: 'Carlson\'s definitive lecture on the Younger Dryas Impact Hypothesis, Meltwater Pulse 1A, the Channeled Scablands, and what the geological record says about catastrophic civilizational reset.',
    url: 'https://www.youtube.com/watch?v=CDF9nRMRNJQ',
    embed_url: 'https://www.youtube.com/embed/CDF9nRMRNJQ',
    thumbnail_url: null,
    channel_name: 'Randall Carlson',
    channel_url: 'https://www.youtube.com/@RandallCarlson',
    guest_names: ['Randall Carlson'],
    key_claims: [
      { claim: 'Ice-free corridor opened too late for Clovis-first model of American settlement', timestamp: '0:35:00' },
      { claim: 'Nano-diamonds in Younger Dryas Boundary layer are exclusively impact-produced', timestamp: '1:10:00' },
    ],
    timestamp_markers: [
      { time: '0:30:00', description: 'Channeled Scablands geological evidence' },
      { time: '1:05:00', description: 'Younger Dryas Boundary impact proxies' },
      { time: '1:45:00', description: 'Meltwater Pulse 1A and flood mythology' },
    ],
    published_at: null,
    duration_seconds: 8400,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['global flood', 'catastrophism', 'lost civilizations'],
    tags: ['carlson', 'younger dryas', 'flood', 'geology', 'catastrophe', 'meltwater', 'ice age'],
    sort_order: 15,
    approved: true,
    featured: true,
  },

  {
    anchor_key: 'yt-robert-sepehr-nephilim',
    type: 'youtube',
    title: 'The Nephilim — Giants of the Ancient World',
    description: 'Survey of Nephilim references across cultures: biblical, Sumerian Apkallu, Egyptian Djinn, Greek Titans — cross-referencing textual and archaeological evidence.',
    url: 'https://www.youtube.com/watch?v=j6D4vdBFpQY',
    embed_url: 'https://www.youtube.com/embed/j6D4vdBFpQY',
    thumbnail_url: null,
    channel_name: 'Robert Sepehr',
    channel_url: 'https://www.youtube.com/@RobertSepehr',
    guest_names: [],
    key_claims: [
      { claim: 'Sumerian Apkallu and biblical Watchers share structural narrative identity', timestamp: '0:12:00' },
    ],
    timestamp_markers: [],
    published_at: null,
    duration_seconds: 1800,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['watchers nephilim', 'Global Giants & Nephilim Parallels'],
    tags: ['nephilim', 'giants', 'watchers', 'apkallu', 'sumerian', 'biblical', 'ancient'],
    sort_order: 30,
    approved: true,
    featured: false,
  },

  {
    anchor_key: 'yt-bright-insight-giant-skeletons',
    type: 'youtube',
    title: 'The Giant Skeleton Cover-Up — Smithsonian & Newspaper Archives',
    description: 'Jimmy Corsetti reviews 19th century newspaper accounts of giant skeletal remains, Smithsonian accession records, and the claims of institutional suppression by Richard Dewhurst.',
    url: 'https://www.youtube.com/watch?v=FZeE5JNgTpk',
    embed_url: 'https://www.youtube.com/embed/FZeE5JNgTpk',
    thumbnail_url: null,
    channel_name: 'Bright Insight',
    channel_url: 'https://www.youtube.com/@BrightInsight',
    guest_names: ['Jimmy Corsetti'],
    key_claims: [
      { claim: 'Over 1,000 newspaper accounts of giant skeletal remains published 1850–1920', timestamp: '0:08:00' },
      { claim: 'Smithsonian accession records show anomalous remains were collected and not publicly reported', timestamp: '0:22:00' },
    ],
    timestamp_markers: [
      { time: '0:05:00', description: 'Newspaper archive survey methodology' },
      { time: '0:20:00', description: 'Smithsonian collection policy questions' },
      { time: '0:35:00', description: 'Richard Dewhurst\'s findings reviewed' },
    ],
    published_at: null,
    duration_seconds: 3000,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['Global Giants & Nephilim Parallels'],
    tags: ['giants', 'smithsonian', 'dewhurst', 'hrdlicka', 'powell', 'suppression', 'skeletons', 'nephilim'],
    sort_order: 10,
    approved: true,
    featured: true,
  },

  {
    anchor_key: 'yt-matrix-wisdom-flood',
    type: 'youtube',
    title: '200+ Flood Myths — What They All Have in Common',
    description: 'Cross-cultural survey of flood narratives from Mesopotamian, biblical, Hindu, Chinese, Mesoamerican, Native American, and Aboriginal Australian traditions. Documents structural convergence.',
    url: 'https://www.youtube.com/watch?v=WCFpGsF6zbo',
    embed_url: 'https://www.youtube.com/embed/WCFpGsF6zbo',
    thumbnail_url: null,
    channel_name: 'Universe Inside You',
    channel_url: 'https://www.youtube.com/@UniverseInsideYou',
    guest_names: [],
    key_claims: [
      { claim: 'Divine warning, lone survivor, vessel, mountain landing appear across all 200+ traditions', timestamp: '0:15:00' },
    ],
    timestamp_markers: [
      { time: '0:12:00', description: 'Mesopotamian flood narrative comparison' },
      { time: '0:30:00', description: 'Non-Western flood traditions' },
    ],
    published_at: null,
    duration_seconds: 2700,
    view_count: null,
    channel_subscriber_count: null,
    topics: ['global flood'],
    tags: ['flood', 'mythology', 'cross-cultural', 'noah', 'gilgamesh', 'convergence', 'traditions'],
    sort_order: 20,
    approved: true,
    featured: false,
  },

];

/**
 * Match anchor media to a topic by checking topic key and tags.
 * Used to auto-attach anchors when a topic is published.
 */
export function getAnchorsForTopic(topic: string): AnchorMediaSeed[] {
  const topicLower = topic.toLowerCase();
  return ANCHOR_MEDIA.filter((a) => {
    // Direct topic match
    if (a.topics.some((t) => t.toLowerCase() === topicLower)) return true;
    // Tag fuzzy match — any tag word appears in topic
    if (a.tags.some((tag) => topicLower.includes(tag) || tag.includes(topicLower.split(' ')[0]))) return true;
    return false;
  }).sort((a, b) => a.sort_order - b.sort_order);
}
