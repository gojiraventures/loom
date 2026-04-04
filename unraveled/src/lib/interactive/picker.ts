/**
 * Component picker — given a SynthesizedOutput, returns a list of
 * ComponentRecords recommended for that report, with pre-computed data payloads.
 * Called at the end of the editor_pass pipeline step.
 */

import type { SynthesizedOutput } from '@/lib/research/types';
import type {
  ComponentRecord,
  ConvergenceScoreGaugeData,
  SourceTypeBreakdownData,
  TraditionDeepDiveData,
  DebateSimulatorData,
  GeoVizData,
} from './types';
import { getTraditionGeo } from '@/lib/viz/tradition-geo';

const SOURCE_TYPE_LABELS: Record<string, string> = {
  journal:             'Academic Journal',
  book:                'Book',
  sacred_text:         'Sacred Text',
  archive:             'Archive / Document',
  excavation_report:   'Excavation Report',
  government_record:   'Government Record',
  museum_db:           'Museum Database',
  website:             'Website',
  other:               'Other',
};

export function pickComponents(output: SynthesizedOutput): ComponentRecord[] {
  const recs: ComponentRecord[] = [];

  // ── 1. Convergence Score Gauge — always ───────────────────────────────────
  if (typeof output.convergence_score === 'number') {
    const data: ConvergenceScoreGaugeData = {
      score:      output.convergence_score,
      traditions: output.traditions_analyzed ?? [],
    };
    recs.push({
      id:      'convergence_score_gauge',
      label:   'Convergence Score Breakdown',
      reason:  `Score ${output.convergence_score}/100 across ${(output.traditions_analyzed ?? []).length} traditions — animate and contextualize this number for readers.`,
      enabled: true,
      data,
    });
  }

  // ── 2. Source Type Breakdown — if ≥ 2 distinct types and ≥ 4 sources ──────
  const sourcesArr = output.sources ?? [];
  if (sourcesArr.length >= 4) {
    const grouped: Record<string, string[]> = {};
    for (const s of sourcesArr) {
      const t = s.source_type ?? 'other';
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(s.title ?? 'Untitled');
    }
    const types = Object.keys(grouped);
    if (types.length >= 2) {
      const groups = types
        .map((t) => ({
          type:   t,
          label:  SOURCE_TYPE_LABELS[t] ?? t.replace(/_/g, ' '),
          count:  grouped[t].length,
          titles: grouped[t].slice(0, 8),
        }))
        .sort((a, b) => b.count - a.count);

      const data: SourceTypeBreakdownData = { groups, total: sourcesArr.length };
      recs.push({
        id:      'source_type_breakdown',
        label:   'Source Type Breakdown',
        reason:  `${sourcesArr.length} sources across ${types.length} categories — donut chart makes the evidence breadth immediately visible.`,
        enabled: true,
        data,
      });
    }
  }

  // ── 3. Tradition Deep-Dive — if ≥ 3 tradition narratives ─────────────────
  const traditionMap = output.how_cultures_describe ?? {};
  const traditionEntries = Object.entries(traditionMap);
  if (traditionEntries.length >= 3) {
    const matrix = output.shared_elements_matrix ?? [];

    const traditions = traditionEntries.map(([name, narrative]) => {
      const motifs = matrix
        .filter((el) => el.traditions[name] === true)
        .map((el) => el.element)
        .slice(0, 6);
      return { name, narrative, motifs };
    });

    const data: TraditionDeepDiveData = { traditions };
    recs.push({
      id:      'tradition_deep_dive',
      label:   'Tradition Deep-Dive Accordion',
      reason:  `${traditionEntries.length} tradition narratives — collapsible cards with motif tags replace the wall of text.`,
      enabled: true,
      data,
    });
  }

  // ── 4. Debate Simulator — if both advocate and skeptic cases exist ─────────
  const advocateParagraphs = (output.advocate_case ?? '')
    .split('\n\n').map((p) => p.trim()).filter(Boolean);
  const skepticParagraphs  = (output.skeptic_case ?? '')
    .split('\n\n').map((p) => p.trim()).filter(Boolean);

  if (advocateParagraphs.length >= 2 && skepticParagraphs.length >= 2) {
    const data: DebateSimulatorData = {
      advocate: { paragraphs: advocateParagraphs },
      skeptic:  { paragraphs: skepticParagraphs },
    };
    recs.push({
      id:      'debate_simulator',
      label:   'Debate Simulator',
      reason:  `${advocateParagraphs.length + skepticParagraphs.length} argument paragraphs — interactive expandable cards replace the static two-column layout.`,
      enabled: true,
      data,
    });
  }

  // ── 5. Convergence Map + Narrative Timeline — gated on geographic coverage ──
  // Requires ≥ 4 traditions with geo data spanning ≥ 2 distinct regions.
  // Both components are added together or not at all.
  const traditions = output.traditions_analyzed ?? [];
  const geoHits = traditions
    .map((t) => ({ tradition: t, geo: getTraditionGeo(t) }))
    .filter((x): x is { tradition: string; geo: NonNullable<ReturnType<typeof getTraditionGeo>> } => x.geo !== undefined);

  if (geoHits.length >= 4) {
    const distinctRegions = new Set(geoHits.map((x) => x.geo.region)).size;
    if (distinctRegions >= 2) {
      const data: GeoVizData = {
        geo_count: geoHits.length,
        region_count: distinctRegions,
      };
      recs.push({
        id:      'convergence_map',
        label:   'Geographic Spread Map',
        reason:  `${geoHits.length} traditions with geographic data across ${distinctRegions} regions — map shows independent emergence across isolated populations.`,
        enabled: true,
        data,
      });
      recs.push({
        id:      'narrative_timeline',
        label:   'Chronology Timeline',
        reason:  `Same ${geoHits.length} traditions plotted chronologically — establishes that diffusion cannot explain simultaneous independent emergence.`,
        enabled: true,
        data,
      });
    }
  }

  // Cap at 6 (admin can disable extras)
  return recs.slice(0, 6);
}
