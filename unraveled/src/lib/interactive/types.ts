/**
 * Shared types for the interactive component system.
 * Each component has a stable ID, a display label, the reason it was recommended,
 * whether the admin has enabled it, and a typed data payload.
 */

export type ComponentId =
  | 'convergence_score_gauge'
  | 'source_type_breakdown'
  | 'tradition_deep_dive'
  | 'debate_simulator'
  | 'convergence_map'
  | 'narrative_timeline';

// ── Per-component data shapes ─────────────────────────────────────────────────

export interface ConvergenceScoreGaugeData {
  score: number;
  traditions: string[];
}

export interface SourceTypeBreakdownData {
  groups: Array<{ type: string; label: string; count: number; titles: string[] }>;
  total: number;
}

export interface TraditionDeepDiveData {
  traditions: Array<{
    name: string;
    narrative: string;
    motifs: string[];
  }>;
}

export interface DebateSimulatorData {
  advocate: { paragraphs: string[] };
  skeptic:  { paragraphs: string[] };
}

/** Lightweight metadata stored when map/timeline are recommended — narratives computed at render time */
export interface GeoVizData {
  geo_count: number;    // traditions with resolved lat/lng
  region_count: number; // distinct regions covered
}

export type ComponentData =
  | ConvergenceScoreGaugeData
  | SourceTypeBreakdownData
  | TraditionDeepDiveData
  | DebateSimulatorData
  | GeoVizData;

// ── Registry record ───────────────────────────────────────────────────────────

export interface ComponentRecord<D extends ComponentData = ComponentData> {
  id:      ComponentId;
  label:   string;
  reason:  string;   // why the system recommended it for this report
  enabled: boolean;  // admin toggles this to include/exclude from the live page
  data:    D;
}
