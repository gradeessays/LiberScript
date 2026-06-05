import { describe, expect, it } from 'vitest';
import { createId, slugify } from '../ids';

describe('createId', () => {
  it('prefixes and strips dashes', () => {
    const id = createId('proj');
    expect(id.startsWith('proj_')).toBe(true);
    expect(id).not.toContain('-');
  });

  it('produces unique ids', () => {
    expect(createId('x')).not.toBe(createId('x'));
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('My Great Book')).toBe('my-great-book');
  });

  it('strips diacritics and punctuation', () => {
    expect(slugify('Café — Déjà Vu!')).toBe('cafe-deja-vu');
  });

  it('trims leading/trailing separators', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });
});
