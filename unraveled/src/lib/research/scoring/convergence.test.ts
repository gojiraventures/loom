import { describe, it, expect } from 'vitest';
import { DEFAULT_CONVERGENCE_CONFIG as C } from './convergence-config';
import { computeConvergence, evidenceWeight, clusterOf, type ScorableFinding, type SharedElement } from './convergence';

const el = (element: string, traditions: string[]): SharedElement => ({
  element,
  traditions: Object.fromEntries(traditions.map((t) => [t, true])),
});

describe('clusterOf', () => {
  it('collapses related traditions into one independence cluster', () => {
    expect(clusterOf('Sumerian', C)).toBe('mesopotamia');
    expect(clusterOf('Babylonian', C)).toBe('mesopotamia');
    expect(clusterOf('Hopi', C)).toBe('north-america');
    expect(clusterOf('Vedic (Manu)', C)).toBe('south-asia');
  });
  it('treats unmapped traditions as their own cluster', () => {
    expect(clusterOf('Atlantean', C)).toBe('solo:atlantean');
  });
});

describe('evidenceWeight — circumstantial/speculative is down-weighted, not dropped', () => {
  it('scores hard evidence near 1.0', () => {
    const hard: ScorableFinding = { claim_type: 'factual', evidence_type: 'archaeological', strength: 'strong', sources: [{ credibility_tier: 1 }] };
    expect(evidenceWeight(hard, C)).toBeCloseTo(0.95, 5); // 0.95*1*1*1
  });
  it('scores speculative/circumstantial evidence low but non-zero', () => {
    const soft: ScorableFinding = { claim_type: 'speculative', evidence_type: 'comparative', strength: 'contested', sources: [{ credibility_tier: 5 }] };
    expect(evidenceWeight(soft, C)).toBeCloseTo(0.4 * 0.3 * 0.3 * 0.2, 5); // 0.0072
    expect(evidenceWeight(soft, C)).toBeGreaterThan(0);
  });
  it('uses the best (lowest) source tier and falls back when no sources', () => {
    const multi: ScorableFinding = { claim_type: 'factual', evidence_type: 'genetic', strength: 'strong', sources: [{ credibility_tier: 4 }, { credibility_tier: 2 }] };
    expect(evidenceWeight(multi, C)).toBeCloseTo(1.0 * 1.0 * 1.0 * 0.85, 5); // tier 2 wins
    const none: ScorableFinding = { claim_type: 'factual', evidence_type: 'genetic', strength: 'strong', sources: [] };
    expect(evidenceWeight(none, C)).toBeCloseTo(1.0 * 1.0 * 1.0 * C.noSourceWeight, 5);
  });
});

describe('computeConvergence — deterministic exact scores', () => {
  const hardFinding: ScorableFinding = { claim_type: 'factual', evidence_type: 'archaeological', strength: 'strong', sources: [{ credibility_tier: 1 }] };

  it('strong: all elements across 3 clusters, hard evidence → 88', () => {
    const r = computeConvergence(
      [hardFinding, hardFinding],
      [el('A', ['Sumerian', 'Hopi', 'Vedic']), el('B', ['Babylonian', 'Navajo', 'Hindu'])],
      C,
    );
    // breadth 1.0, depth 0.6, quality 0.95 → 0.4+0.15+0.3325 = 0.8825
    expect(r.score).toBe(88);
    expect(r.band).toBe('Extraordinary convergence');
    expect(r.convergingElements).toBe(2);
  });

  it('weak: one element in only 2 clusters + speculative evidence → 0', () => {
    const soft: ScorableFinding = { claim_type: 'speculative', evidence_type: 'comparative', strength: 'contested', sources: [{ credibility_tier: 5 }] };
    const r = computeConvergence([soft], [el('A', ['Sumerian', 'Hopi'])], C);
    expect(r.convergingElements).toBe(0);
    expect(r.score).toBe(0);
  });

  it('moderate: 2 of 3 elements converge, mid-grade evidence → 54', () => {
    const mid: ScorableFinding = { claim_type: 'factual', evidence_type: 'textual', strength: 'moderate', sources: [{ credibility_tier: 2 }] }; // 0.357
    const r = computeConvergence(
      [mid],
      [el('A', ['Sumerian', 'Hopi', 'Vedic']), el('B', ['Babylonian', 'Navajo', 'Hindu']), el('C', ['Greek', 'Roman'])],
      C,
    );
    // breadth 2/3=0.6667, depth 0.6, quality 0.357 → 0.26668+0.15+0.12495 = 0.5416
    expect(r.score).toBe(54);
    expect(r.band).toBe('Moderate convergence');
  });

  it('is deterministic — identical inputs give identical output', () => {
    const inputs = () => computeConvergence([hardFinding], [el('A', ['Sumerian', 'Hopi', 'Vedic'])], C);
    expect(inputs()).toEqual(inputs());
  });

  it('adjacent traditions do NOT inflate the score (cluster collapse)', () => {
    // 3 Mesopotamian traditions = 1 cluster → below threshold → no convergence.
    const r = computeConvergence([hardFinding], [el('A', ['Sumerian', 'Babylonian', 'Akkadian'])], C);
    expect(r.elementDetail[0].clusters).toBe(1);
    expect(r.convergingElements).toBe(0);
  });

  it('empty inputs → 0 and not applicable', () => {
    const r = computeConvergence([], [], C);
    expect(r.score).toBe(0);
    expect(r.applicable).toBe(false);
  });

  it('single-subject topics (too few shared elements) are marked not applicable', () => {
    const oneEl = computeConvergence([hardFinding], [el('A', ['Sumerian', 'Hopi', 'Vedic'])], C);
    expect(oneEl.applicable).toBe(false); // 1 element < minElementsForScore (3)
    const threeEls = computeConvergence(
      [hardFinding],
      [el('A', ['Sumerian', 'Hopi', 'Vedic']), el('B', ['Greek', 'Norse', 'Chinese']), el('C', ['Maya', 'Yoruba', 'Aboriginal'])],
      C,
    );
    expect(threeEls.applicable).toBe(true);
  });
});
