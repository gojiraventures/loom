/**
 * Convergence scoring config — the single, versioned knob panel.
 *
 * Every weight and threshold that shapes a Convergence Score lives here. The
 * scorer (convergence.ts) is a pure function of (findings, elements, config), so
 * changing a number here changes every score deterministically and the results
 * stay reproducible + testable. Bump the version whenever weights change so each
 * stored score records which ruleset produced it.
 *
 * NOTE: kept in code for now (one file, pure data). Moving it to a DB row for
 * live tuning without a deploy is a drop-in later — the scorer already takes the
 * config as a parameter.
 */

export const CONVERGENCE_CONFIG_VERSION = 'v1.0.0';

export interface ConvergenceConfig {
  version: string;
  /** Evidence-quality weights (0–1) — how much a single finding "counts". */
  evidenceType: Record<string, number>;
  claimType: Record<string, number>;
  strength: Record<string, number>;
  /** Best (lowest-numbered) source tier a finding cites → weight. */
  sourceTier: Record<string, number>;
  noSourceWeight: number;
  defaultFactor: number;
  /** A shared element only counts as convergent at/above this many independent clusters. */
  minClustersToConverge: number;
  /** Cluster count at which an element's breadth is considered "full". */
  idealClusters: number;
  /** Below this many shared elements, the topic isn't a cross-tradition convergence
   *  study — the score is "not applicable" rather than a misleading number. */
  minElementsForScore: number;
  /** How the three components combine (normalized internally). */
  componentWeights: { breadth: number; depth: number; quality: number };
  /** Map a tradition name (lowercased substring match) to an independence cluster. */
  clusterMap: Record<string, string>;
  bands: { min: number; label: string }[];
}

export const DEFAULT_CONVERGENCE_CONFIG: ConvergenceConfig = {
  version: CONVERGENCE_CONFIG_VERSION,

  // Hard, physical evidence weighs most; interpretive comparison weighs least.
  evidenceType: {
    genetic: 1.0, geological: 1.0, archaeological: 0.95, statistical: 0.8,
    textual: 0.7, iconographic: 0.6, oral_tradition: 0.5, comparative: 0.4,
  },
  // A speculative claim still counts — at ~a third of a documented fact.
  claimType: { factual: 1.0, interpretive: 0.7, oral_account: 0.5, speculative: 0.3 },
  strength: { strong: 1.0, moderate: 0.6, contested: 0.3 },
  sourceTier: { '1': 1.0, '2': 0.85, '3': 0.6, '4': 0.4, '5': 0.2 },
  noSourceWeight: 0.3,
  defaultFactor: 0.5,

  minClustersToConverge: 3,
  idealClusters: 5,
  minElementsForScore: 3,
  componentWeights: { breadth: 0.4, depth: 0.25, quality: 0.35 },

  // Independence clusters: related traditions collapse to one region so borrowed /
  // adjacent cultures don't inflate the count. Unlisted traditions become their own
  // cluster (conservative — treated as independent).
  clusterMap: {
    sumerian: 'mesopotamia', akkadian: 'mesopotamia', babylonian: 'mesopotamia', assyrian: 'mesopotamia', 'mesopotam': 'mesopotamia',
    hebrew: 'levant', israelite: 'levant', canaanite: 'levant', biblical: 'levant', judaic: 'levant',
    egyptian: 'north-africa',
    greek: 'mediterranean', roman: 'mediterranean', hellenic: 'mediterranean',
    norse: 'northern-europe', germanic: 'northern-europe', celtic: 'northern-europe', 'eddic': 'northern-europe',
    vedic: 'south-asia', hindu: 'south-asia', indian: 'south-asia', manu: 'south-asia', sanskrit: 'south-asia',
    chinese: 'east-asia', 'china': 'east-asia', japanese: 'east-asia',
    aboriginal: 'australia', narrangga: 'australia', australian: 'australia', dreamtime: 'australia',
    hopi: 'north-america', navajo: 'north-america', anishinaabe: 'north-america', lakota: 'north-america', klamath: 'north-america', ojibwe: 'north-america', 'native american': 'north-america',
    maya: 'mesoamerica', 'quiché': 'mesoamerica', quiche: 'mesoamerica', aztec: 'mesoamerica', mesoamerican: 'mesoamerica', inca: 'andes', andean: 'andes',
    yoruba: 'west-africa', dogon: 'west-africa', 'sub-saharan': 'sub-saharan-africa', bantu: 'sub-saharan-africa',
    polynesian: 'oceania', maori: 'oceania', hawaiian: 'oceania',
  },

  bands: [
    { min: 80, label: 'Extraordinary independent convergence' },
    { min: 60, label: 'Strong independent convergence' },
    { min: 40, label: 'Moderate convergence' },
    { min: 20, label: 'Weak convergence' },
    { min: 0, label: 'Minimal — likely borrowed or coincidental' },
  ],
};
