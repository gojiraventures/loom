import { getTraditionGeo } from './tradition-geo';
import type { VizNarrative } from './types';
import type { SynthesizedOutput } from '@/lib/research/types';

/**
 * Convert a SynthesizedOutput into VizNarrative[] for use with ConvergenceMap and NarrativeTimeline.
 *
 * - Uses traditions_analyzed as the list of traditions to map
 * - Geo/chronological data comes from the tradition-geo lookup table
 * - Descriptions come from how_cultures_describe[tradition]
 * - Source citations come from the sources array (best-effort match by tradition name)
 * - Returns only traditions that have geo data (unknown traditions are skipped)
 */
export function synthesisToVizNarratives(output: SynthesizedOutput): VizNarrative[] {
  const traditions = output.traditions_analyzed ?? [];
  const descriptions = output.how_cultures_describe ?? {};
  const sources = output.sources ?? [];

  const narratives: VizNarrative[] = [];

  for (const tradition of traditions) {
    const geo = getTraditionGeo(tradition);
    if (!geo) continue;

    // Best-effort source: find a source whose title or author mentions the tradition
    const tradLower = tradition.toLowerCase();
    const matchedSource = sources.find(
      (s) =>
        s.title?.toLowerCase().includes(tradLower) ||
        (s.author ?? '').toLowerCase().includes(tradLower),
    );
    const sourceLabel = matchedSource
      ? `${matchedSource.author ? `${matchedSource.author}, ` : ''}${matchedSource.title}${matchedSource.year ? ` (${matchedSource.year})` : ''}`
      : geo.region;

    const desc = descriptions[tradition] ?? descriptions[tradition.toLowerCase()] ?? '';

    narratives.push({
      id: tradition.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      lat: geo.lat,
      lng: geo.lng,
      year: geo.year,
      title: tradition,
      region: geo.region,
      type: geo.type,
      tradition,
      desc: desc || `${tradition} tradition — ${geo.region}`,
      source: sourceLabel,
    });
  }

  return narratives;
}
