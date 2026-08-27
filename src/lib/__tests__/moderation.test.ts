import { describe, expect, it } from 'vitest';
import { hasOffensiveContent } from '../moderation';

describe('hasOffensiveContent', () => {
  it('returns false for clean text', () => {
    expect(hasOffensiveContent('Seberapa puas Anda dengan sesi ini?')).toBe(false);
  });

  it('returns false for undefined/null/empty inputs', () => {
    expect(hasOffensiveContent(undefined, null, '')).toBe(false);
    expect(hasOffensiveContent()).toBe(false);
  });

  it('flags a whole-word match of a banned term', () => {
    expect(hasOffensiveContent('dasar bangsat kamu')).toBe(true);
  });

  it('does not flag substrings that merely contain a banned term', () => {
    // "asu" is banned, but it must not match inside unrelated words
    expect(hasOffensiveContent('asuransi kesehatan sangat penting')).toBe(false);
  });

  it('does not flag words with legitimate meaning that share a term list entry', () => {
    // "anjing" (dog) is intentionally excluded from the list, unlike stronger slurs
    expect(hasOffensiveContent('saya suka anjing')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(hasOffensiveContent('BANGSAT')).toBe(true);
  });

  it('ignores diacritics via NFD normalization', () => {
    expect(hasOffensiveContent('bangsàt')).toBe(true);
  });

  it('matches banned phrases spanning multiple words', () => {
    expect(hasOffensiveContent('dia mengancam akan bakar rumah tetangganya')).toBe(true);
  });

  it('checks across all provided text arguments combined', () => {
    expect(hasOffensiveContent('nama biasa', 'organisasi biasa', 'pesan berisi kontol')).toBe(true);
  });
});
