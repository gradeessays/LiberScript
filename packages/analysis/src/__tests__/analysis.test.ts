import { describe, expect, it } from 'vitest';
import { countWords } from '@liberscript/core';
import { computeStats } from '../stats';
import { assembleChapters, isChapterHeading, matchChapterHeading, chapterText } from '../chapters';
import { htmlToBlocks, textToBlocks } from '../blocks';
import { htmlToText } from '../html';
import { blocksToTiptap } from '../tiptap';
import { parseMarkdown, parseTxt } from '../parsers/text';
import type { ContentBlock } from '../types';

describe('isChapterHeading', () => {
  it('matches chapter/part/front-matter markers', () => {
    expect(isChapterHeading('Chapter 1')).toBe(true);
    expect(isChapterHeading('CHAPTER TWELVE')).toBe(true);
    expect(isChapterHeading('Part 2')).toBe(true);
    expect(isChapterHeading('Prologue')).toBe(true);
  });
  it('does NOT match arbitrary sub-headings or bare numbers (strong mode)', () => {
    expect(isChapterHeading('A Quiet Morning')).toBe(false);
    expect(isChapterHeading('1.2 Background')).toBe(false);
    expect(isChapterHeading('THE END OF DAYS')).toBe(false);
    expect(isChapterHeading('1')).toBe(false); // bare not allowed in strong mode
  });
});

describe('matchChapterHeading (naming scenarios)', () => {
  it('parses prefixed numbers, romans, and words', () => {
    expect(matchChapterHeading('Chapter 1')).toEqual({ title: 'Chapter 1', subtitle: undefined });
    expect(matchChapterHeading('Chapter I')).toEqual({ title: 'Chapter I', subtitle: undefined });
    expect(matchChapterHeading('Chapter One')).toEqual({ title: 'Chapter One', subtitle: undefined });
  });
  it('splits inline titles after : — – or spaced hyphen', () => {
    expect(matchChapterHeading('Chapter 1: The Beginning')).toEqual({
      title: 'Chapter 1',
      subtitle: 'The Beginning',
    });
    expect(matchChapterHeading('Chapter I — A New Dawn')).toEqual({
      title: 'Chapter I',
      subtitle: 'A New Dawn',
    });
    expect(matchChapterHeading('Chapter 3 - Homecoming')).toEqual({
      title: 'Chapter 3',
      subtitle: 'Homecoming',
    });
  });
  it('keeps hyphenated number words intact', () => {
    expect(matchChapterHeading('Chapter Twenty-One')).toEqual({
      title: 'Chapter Twenty-One',
      subtitle: undefined,
    });
  });
  it('recognizes bare numbers/romans/words only when allowed', () => {
    expect(matchChapterHeading('1', true)).toEqual({ title: '1', subtitle: undefined });
    expect(matchChapterHeading('IV', true)).toEqual({ title: 'IV', subtitle: undefined });
    expect(matchChapterHeading('Three', true)).toEqual({ title: 'Three', subtitle: undefined });
    expect(matchChapterHeading('1: Dawn', true)).toEqual({ title: '1', subtitle: 'Dawn' });
    expect(matchChapterHeading('1', false)).toBeNull();
  });
  it('rejects ordinary words that look vaguely roman', () => {
    expect(matchChapterHeading('Mix', true)).toBeNull();
    expect(matchChapterHeading('A Quiet Morning', true)).toBeNull();
  });
});

describe('assembleChapters', () => {
  it('only starts chapters at chapter headings; folds sub-headings into body', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'Chapter 1' },
      { kind: 'para', text: 'Opening paragraph.' },
      { kind: 'heading', level: 2, text: 'A Subsection' },
      { kind: 'para', text: 'More text.' },
      { kind: 'heading', level: 1, text: 'Chapter 2' },
      { kind: 'para', text: 'Second chapter.' },
    ];
    const chapters = assembleChapters(blocks);
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.title).toBe('Chapter 1');
    // The sub-heading stayed inside chapter 1, not a new chapter.
    expect(chapters[0]?.blocks.some((b) => b.text === 'A Subsection')).toBe(true);
  });

  it('captures an immediate short heading as the chapter subtitle', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'Chapter 1' },
      { kind: 'heading', level: 2, text: 'The Beginning' },
      { kind: 'para', text: 'Body text here.' },
    ];
    const [ch] = assembleChapters(blocks);
    expect(ch?.subtitle).toBe('The Beginning');
    expect(ch?.blocks).toHaveLength(1);
    expect(ch?.blocks[0]?.text).toBe('Body text here.');
  });

  it('captures a truncated phrase paragraph as subtitle', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'Chapter 3' },
      { kind: 'para', text: 'In Which Much Happens' },
      { kind: 'para', text: 'A full sentence of prose follows here.' },
    ];
    const [ch] = assembleChapters(blocks);
    expect(ch?.subtitle).toBe('In Which Much Happens');
  });

  it('does not treat a real sentence as a subtitle', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'Chapter 4' },
      { kind: 'para', text: 'It was a dark and stormy night.' },
    ];
    const [ch] = assembleChapters(blocks);
    expect(ch?.subtitle).toBeUndefined();
  });

  it('falls back to shallowest heading split when no chapter markers exist', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'A Title' },
      { kind: 'para', text: 'one' },
      { kind: 'heading', level: 1, text: 'Another Title' },
      { kind: 'para', text: 'two' },
    ];
    expect(assembleChapters(blocks)).toHaveLength(2);
  });
});

describe('parseTxt / parseMarkdown', () => {
  it('does not over-split a Chapter book with subsections (txt)', () => {
    const txt = [
      'Chapter 1',
      'The Start',
      '',
      'Some prose.',
      '',
      'A Subsection',
      '',
      'More prose.',
      '',
      'Chapter 2',
      '',
      'Next chapter prose.',
    ].join('\n');
    const chapters = parseTxt(Buffer.from(txt));
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.subtitle).toBe('The Start');
  });

  it('markdown chapters anchor on Chapter headings; immediate subheading = subtitle', () => {
    const md = '# Chapter 1\n## A Scene\n\nText.\n\n# Chapter 2\n\nMore.';
    const chapters = parseMarkdown(Buffer.from(md));
    expect(chapters).toHaveLength(2);
    // The subheading right after the chapter title becomes its subtitle.
    expect(chapters[0]?.subtitle).toBe('A Scene');
  });

  it('markdown folds a later subsection into the chapter body', () => {
    const md = '# Chapter 1\n\nText.\n\n## A Scene\n\nMore.\n\n# Chapter 2\n\nEnd.';
    const chapters = parseMarkdown(Buffer.from(md));
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.subtitle).toBeUndefined();
    expect(chapters[0]?.blocks.some((b) => b.text === 'A Scene')).toBe(true);
  });
});

describe('html + blocks + stats', () => {
  it('htmlToBlocks extracts headings and paragraphs in order', () => {
    const blocks = htmlToBlocks('<h1>Chapter 1</h1><p>Hi</p><h2>Sub</h2><p>Bye</p>');
    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toEqual({ kind: 'heading', level: 1, text: 'Chapter 1' });
  });
  it('htmlToText decodes entities', () => {
    expect(htmlToText('<p>Tom &amp; Jerry</p>')).toBe('Tom & Jerry');
  });
  it('countWords + computeStats aggregate body, title, subtitle', () => {
    expect(countWords('one two three')).toBe(3);
    const stats = computeStats([
      { title: 'Chapter 1', subtitle: 'Intro', blocks: [{ kind: 'para', text: 'a b c' }] },
    ]);
    expect(stats.wordCount).toBeGreaterThanOrEqual(5);
  });
  it('textToBlocks groups paragraphs and detects chapter headings', () => {
    const blocks = textToBlocks('Chapter 1\n\nHello world.', isChapterHeading);
    expect(blocks[0]).toEqual({ kind: 'heading', level: 1, text: 'Chapter 1' });
  });
});

describe('blocksToTiptap', () => {
  it('maps headings and paragraphs to a doc', () => {
    const doc = blocksToTiptap([
      { kind: 'heading', level: 2, text: 'Sub' },
      { kind: 'para', text: 'Body.' },
    ]);
    expect(doc.type).toBe('doc');
    expect(doc.content[0]?.type).toBe('heading');
    expect(doc.content[1]?.type).toBe('paragraph');
  });
  it('chapterText flattens blocks', () => {
    expect(chapterText({ title: 'C', blocks: [{ kind: 'para', text: 'x y' }] })).toBe('x y');
  });
});
