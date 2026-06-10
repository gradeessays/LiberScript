import { describe, expect, it } from 'vitest';
import { countSyllables, critiqueBook, splitSentences } from '../critique';

const ch = (id: string, title: string, text: string) => ({ id, title, text });

describe('splitSentences', () => {
  it('splits on terminal punctuation and newlines', () => {
    const s = splitSentences('He ran. She followed! Did they make it? "Yes." They did.');
    expect(s.length).toBeGreaterThanOrEqual(4);
  });
});

describe('countSyllables', () => {
  it('estimates common words sensibly', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('hello')).toBe(2);
    expect(countSyllables('beautiful')).toBeGreaterThanOrEqual(3);
  });
});

describe('critiqueBook', () => {
  it('flags adverbs, passive voice, filler, telling, and pacing', () => {
    const book = critiqueBook([
      ch(
        'c1',
        'Chapter 1',
        `He ran quickly and spoke softly. The door was opened by the guard.
         It was really just very strange. She felt afraid. Suddenly the light died.`,
      ),
    ]);
    const byCat = Object.fromEntries(book.findings.map((f) => [f.category, f]));
    expect(byCat.adverbs!.count).toBeGreaterThanOrEqual(2);
    expect(byCat.passive!.count).toBeGreaterThanOrEqual(1);
    expect(byCat.filler!.count).toBeGreaterThanOrEqual(2);
    expect(byCat.telling!.count).toBeGreaterThanOrEqual(1);
    expect(byCat.pacing!.count).toBe(1);
    expect(byCat.adverbs!.examples.length).toBeGreaterThan(0);
    expect(byCat.adverbs!.examples[0]!.chapter).toBe('Chapter 1');
  });

  it('detects clichés and very long sentences', () => {
    const long = `the path wound on and on through the trees and over the hills and past the river
      and across the valley and beyond the mountains and into the mist where nothing was
      certain and nobody had gone before and the air grew thin`.replace(/\s+/g, ' ');
    const book = critiqueBook([
      ch('c1', 'One', `At the end of the day, it was a piece of cake. ${long}.`),
    ]);
    const byCat = Object.fromEntries(book.findings.map((f) => [f.category, f]));
    expect(byCat.cliche!.count).toBe(2);
    expect(byCat['long-sentence']!.count).toBe(1);
  });

  it('computes dialogue ratio and readability', () => {
    const book = critiqueBook([
      ch('c1', 'One', `"Where are we going?" she asked. "Home," he said. They walked on in silence.`),
    ]);
    expect(book.dialogueRatio).toBeGreaterThan(0.2);
    expect(book.readingEase).toBeGreaterThan(50); // simple words → easy
    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0]!.wordCount).toBeGreaterThan(10);
  });

  it('scores clean prose higher than issue-dense prose', () => {
    const clean = critiqueBook([
      ch('c1', 'One', `Mara opened the door. Rain hammered the porch. She stepped out and the cold bit her cheeks. The road stretched empty toward the hills.`),
    ]);
    const messy = critiqueBook([
      ch('c1', 'One', `It was really very quickly done and the thing was basically opened by someone suddenly.
        At the end of the day it was a piece of cake. He felt totally afraid. It was just simply utterly strange.
        The room was filled by fog. The letter was written by hand. Suddenly it was certainly probably fine.`),
    ]);
    expect(clean.score).toBeGreaterThan(messy.score);
  });

  it('handles an empty book without dividing by zero', () => {
    const book = critiqueBook([]);
    expect(book.wordCount).toBe(0);
    expect(book.score).toBeLessThanOrEqual(100);
    expect(Number.isFinite(book.readingEase)).toBe(true);
  });
});
