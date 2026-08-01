/**
 * Convergence scorer — deterministic, countable, config-driven.
 *
 * Pure function of (findings, sharedElements, config). Same inputs → same score,
 * always. No LLM, no randomness, no hidden state. Every number is traceable to
 * the config in convergence-config.ts.
 *
 * The score answers ONE question: how consistently do the SAME specific narrative
 * elements appear across INDEPENDENT (geographically/culturally isolated) tradition
 * clusters, weighted by how good the evidence behind them is?
 *
 * Three components (each 0–1, combined by config weights):
 *   breadth  — fraction of shared elements attested in ≥ minClusters independent clusters
 *   depth    — how widely those converging elements spread (clusters / idealClusters)
 *   quality  — mean evidence weight of the findings (this is where speculative/
 *              circumstantial evidence is down-weighted, never dropped)
 */
import type { ConvergenceConfig } from './convergence-config';

export interface ScorableFinding {
  claim_type?: string | null;
  evidence_type?: string | null;
  strength?: string | null;
  sources?: { credibility_tier?: number | null }[] | null;
}
export interface SharedElement {
  element: string;
  traditions: Record<string, boolean>;
}

export interface ConvergenceBreakdown {
  /** False when the topic has too few cross-tradition elements to score honestly
   *  (a single-subject investigation). UI should hide the number in that case. */
  applicable: boolean;
  score: number;             // 0–100
  band: string;
  components: { breadth: number; depth: number; quality: number };
  convergingElements: number;
  totalElements: number;
  findingsScored: number;
  configVersion: string;
  /** Per-element cluster tallies, for the transparent methodology panel. */
  elementDetail: { element: string; clusters: number; converges: boolean }[];
}

/** Map a tradition name to its independence cluster (or itself if unmapped). */
export function clusterOf(tradition: string, config: ConvergenceConfig): string {
  const t = tradition.toLowerCase().trim();
  for (const [key, cluster] of Object.entries(config.clusterMap)) {
    if (t.includes(key)) return cluster;
  }
  return `solo:${t}`; // unmapped → treated as its own independent cluster
}

/** Evidence weight (0–1) for a single finding — the circumstantial/speculative dial. */
export function evidenceWeight(f: ScorableFinding, config: ConvergenceConfig): number {
  const et = config.evidenceType[f.evidence_type ?? ''] ?? config.defaultFactor;
  const ct = config.claimType[f.claim_type ?? ''] ?? config.defaultFactor;
  const st = config.strength[f.strength ?? ''] ?? config.defaultFactor;
  let tier = config.noSourceWeight;
  const tiers = (f.sources ?? []).map((s) => s?.credibility_tier).filter((n): n is number => typeof n === 'number');
  if (tiers.length) tier = config.sourceTier[String(Math.min(...tiers))] ?? config.defaultFactor;
  return et * ct * st * tier;
}

export function computeConvergence(
  findings: ScorableFinding[],
  sharedElements: SharedElement[],
  config: ConvergenceConfig,
): ConvergenceBreakdown {
  // ── Quality: mean evidence weight across findings ──
  const quality = findings.length
    ? findings.reduce((sum, f) => sum + evidenceWeight(f, config), 0) / findings.length
    : 0;

  // ── Breadth + depth: independent-cluster spread of shared elements ──
  const elementDetail = sharedElements.map((el) => {
    const clusters = new Set<string>();
    for (const [tradition, present] of Object.entries(el.traditions ?? {})) {
      if (present) clusters.add(clusterOf(tradition, config));
    }
    return { element: el.element, clusters: clusters.size, converges: clusters.size >= config.minClustersToConverge };
  });

  const converging = elementDetail.filter((e) => e.converges);
  const breadth = sharedElements.length ? converging.length / sharedElements.length : 0;
  const depth = converging.length
    ? converging.reduce((s, e) => s + Math.min(e.clusters / config.idealClusters, 1), 0) / converging.length
    : 0;

  // ── Combine ──
  const { breadth: wB, depth: wD, quality: wQ } = config.componentWeights;
  const wSum = wB + wD + wQ || 1;
  const raw = (wB * breadth + wD * depth + wQ * quality) / wSum;
  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  const band = (config.bands.find((b) => score >= b.min) ?? config.bands[config.bands.length - 1]).label;
  const applicable = sharedElements.length >= config.minElementsForScore;

  return {
    applicable,
    score,
    band,
    components: {
      breadth: Number(breadth.toFixed(3)),
      depth: Number(depth.toFixed(3)),
      quality: Number(quality.toFixed(3)),
    },
    convergingElements: converging.length,
    totalElements: sharedElements.length,
    findingsScored: findings.length,
    configVersion: config.version,
    elementDetail,
  };
}

/** One-line human summary for the methodology panel. */
export function convergenceSummary(b: ConvergenceBreakdown, minClusters: number): string {
  return `${b.convergingElements} of ${b.totalElements} core elements appear across ≥${minClusters} independent tradition clusters; weighted by evidence quality (${Math.round(b.components.quality * 100)}%).`;
}
