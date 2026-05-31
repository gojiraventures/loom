import { describe, it, expect } from 'vitest';
import { lineageOf, assertDifferentLineage, pickValidator } from './lineage';

describe('lineageOf', () => {
  it('maps claude models to anthropic', () => {
    expect(lineageOf('claude-sonnet-4-6')).toBe('anthropic');
    expect(lineageOf('claude-opus-4-6')).toBe('anthropic');
    expect(lineageOf('claude')).toBe('anthropic');
  });

  it('maps qwen models to alibaba', () => {
    expect(lineageOf('qwen-qwq-32b')).toBe('alibaba');
    expect(lineageOf('qwen2.5:14b')).toBe('alibaba');
  });

  it('maps llama models to meta', () => {
    expect(lineageOf('llama-3.3-70b-versatile')).toBe('meta');
    expect(lineageOf('llama3.1:8b')).toBe('meta');
  });

  it('maps gemini models to google', () => {
    expect(lineageOf('gemini-2.5-pro')).toBe('google');
    expect(lineageOf('gemini-flash')).toBe('google');
    expect(lineageOf('gemini')).toBe('google');
  });

  it('maps sonar models to perplexity', () => {
    expect(lineageOf('sonar-pro')).toBe('perplexity');
  });

  it('maps grok models to xai', () => {
    expect(lineageOf('grok-3')).toBe('xai');
  });

  it('maps mistral/mixtral to mistral', () => {
    expect(lineageOf('mixtral-8x7b-32768')).toBe('mistral');
    expect(lineageOf('mistral-7b')).toBe('mistral');
  });

  it('throws for unrecognised models — fail closed', () => {
    expect(() => lineageOf('unknown-model-xyz')).toThrow('[lineage] Unrecognised model');
    expect(() => lineageOf('')).toThrow('[lineage] Unrecognised model');
  });
});

describe('assertDifferentLineage', () => {
  it('passes for different lineages', () => {
    expect(() => assertDifferentLineage('qwen-qwq-32b', 'claude-sonnet-4-6')).not.toThrow();
    expect(() => assertDifferentLineage('llama-3.3-70b-versatile', 'gemini-2.5-pro')).not.toThrow();
  });

  it('throws when same family generates and validates — core constraint', () => {
    expect(() =>
      assertDifferentLineage('qwen-qwq-32b', 'qwen2.5:14b'),
    ).toThrow('alibaba');

    expect(() =>
      assertDifferentLineage('claude-sonnet-4-6', 'claude-opus-4-6'),
    ).toThrow('anthropic');

    expect(() =>
      assertDifferentLineage('gemini-2.5-pro', 'gemini-flash'),
    ).toThrow('google');

    expect(() =>
      assertDifferentLineage('llama-3.3-70b-versatile', 'llama3.1:8b'),
    ).toThrow('meta');
  });
});

describe('pickValidator', () => {
  it('prefers claude over other validators', () => {
    const result = pickValidator('qwen-qwq-32b', ['gemini-2.5-pro', 'claude-sonnet-4-6', 'sonar-pro']);
    expect(result).toBe('claude-sonnet-4-6');
  });

  it('falls back to gemini if claude not in pool', () => {
    const result = pickValidator('qwen-qwq-32b', ['gemini-2.5-pro', 'sonar-pro']);
    expect(result).toBe('gemini-2.5-pro');
  });

  it('excludes same-lineage models from pool', () => {
    const result = pickValidator('qwen-qwq-32b', ['qwen2.5:14b', 'claude-sonnet-4-6']);
    expect(result).toBe('claude-sonnet-4-6');
  });

  it('throws when no cross-lineage validator is available', () => {
    expect(() =>
      pickValidator('claude-sonnet-4-6', ['claude-opus-4-6']),
    ).toThrow('No cross-lineage validator');
  });

  it('throws when pool contains only unmapped models', () => {
    expect(() =>
      pickValidator('qwen-qwq-32b', ['unknown-model-xyz']),
    ).toThrow('No cross-lineage validator');
  });
});
