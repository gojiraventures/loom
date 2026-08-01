import { describe, it, expect } from 'vitest';
import { stripTypographicDashes, sanitizeDashesDeep } from './text-sanitize';

describe('stripTypographicDashes', () => {
  it('replaces a spaced em dash with a comma', () => {
    expect(stripTypographicDashes('The claim — widely repeated — is false.'))
      .toBe('The claim, widely repeated, is false.');
  });

  it('replaces an unspaced em dash with a comma', () => {
    expect(stripTypographicDashes('word—word')).toBe('word, word');
  });

  it('converts a numeric en dash range to "X to Y"', () => {
    expect(stripTypographicDashes('7,000–10,000 years ago')).toBe('7,000 to 10,000 years ago');
  });

  it('replaces any remaining en dash with a hyphen', () => {
    expect(stripTypographicDashes('pages 12–15 non-numeric–case')).toBe('pages 12 to 15 non-numeric-case');
  });

  it('leaves normal hyphens and text untouched', () => {
    const s = 'A well-known, ordinary sentence with no special punctuation.';
    expect(stripTypographicDashes(s)).toBe(s);
  });
});

describe('sanitizeDashesDeep', () => {
  it('strips dashes from every nested string field', () => {
    const input = {
      title: 'A — Title',
      layers: [{ content: 'X—Y', range: '100–200' }],
      keep: 42,
    };
    const out = sanitizeDashesDeep(input);
    expect(out.title).toBe('A, Title');
    expect(out.layers[0].content).toBe('X, Y');
    expect(out.layers[0].range).toBe('100 to 200');
    expect(out.keep).toBe(42);
  });
});
