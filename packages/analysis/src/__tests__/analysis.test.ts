import { describe, expect, it } from 'vitest';
import { countWords, ChapterKind } from '@liberscript/core';
import { computeStats } from '../stats';
import {
  assembleSections,
  classifyHeading,
  isChapterHeading,
  matchChapterHeading,
  chapterText,
} from '../chapters';
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
  });
  it('does NOT match arbitrary sub-headings or bare numbers (strong mode)', () => {
    expect(isChapterHeading('A Quiet Morning')).toBe(false);
    expect(isChapterHeading('1.2 Background')).toBe(false);
    expect(isChapterHeading('1')).toBe(false);
  });
});

describe('classifyHeading (section kinds)', () => {
  it('classifies front/body/back matter', () => {
    expect(classifyHeading('Copyright')?.kind).toBe(ChapterKind.COPYRIGHT);
    expect(classifyHeading('Dedication')?.kind).toBe(ChapterKind.DEDICATION);
    expect(classifyHeading('Table of Contents')?.kind).toBe(ChapterKind.TOC);
    expect(classifyHeading('Prologue')?.kind).toBe(ChapterKind.PROLOGUE);
    expect(classifyHeading('Introduction')?.kind).toBe(ChapterKind.INTRODUCTION);
    expect(classifyHeading('Chapter 1')?.kind).toBe(ChapterKind.CHAPTER);
    expect(classifyHeading('Epilogue')?.kind).toBe(ChapterKind.EPILOGUE);
    expect(classifyHeading('About the Author')?.kind).toBe(ChapterKind.ABOUT_AUTHOR);
    expect(classifyHeading('Acknowledgments')?.kind).toBe(ChapterKind.ACKNOWLEDGMENTS);
  });
  it('returns null for ordinary prose lines', () => {
    expect(classifyHeading('A Quiet Morning')).toBeNull();
  });
});

describe('matchChapterHeading (naming scenarios)', () => {
  it('parses prefixed numbers/romans/words and inline titles', () => {
    expect(matchChapterHeading('Chapter 1')).toMatchObject({ title: 'Chapter 1' });
    expect(matchChapterHeading('Chapter 1: The Beginning')).toMatchObject({
      title: 'Chapter 1',
      subtitle: 'The Beginning',
    });
    expect(matchChapterHeading('Chapter Twenty-One')).toMatchObject({ title: 'Chapter Twenty-One' });
  });
  it('bare numbers only when allowed; rejects roman-looking words', () => {
    expect(matchChapterHeading('IV', true)).toMatchObject({ title: 'IV' });
    expect(matchChapterHeading('1', false)).toBeNull();
    expect(matchChapterHeading('Mix', true)).toBeNull();
  });
});

describe('assembleSections', () => {
  it('detects a title page + author, then classifies sections', () => {
    const blocks: ContentBlock[] = [
      { kind: 'para', text: 'The Great Novel' },
      { kind: 'para', text: 'by Jane Doe' },
      { kind: 'heading', level: 1, text: 'Copyright' },
      { kind: 'para', text: '© 2026 Jane Doe' },
      { kind: 'heading', level: 1, text: 'Dedication' },
      { kind: 'para', text: 'For everyone.' },
      { kind: 'heading', level: 1, text: 'Chapter 1' },
      { kind: 'para', text: 'It began.' },
      { kind: 'heading', level: 1, text: 'Epilogue' },
      { kind: 'para', text: 'It ended.' },
    ];
    const { chapters, title, author } = assembleSections(blocks);
    expect(title).toBe('The Great Novel');
    expect(author).toBe('Jane Doe');
    const kinds = chapters.map((c) => c.kind);
    expect(kinds).toEqual([
      ChapterKind.TITLE_PAGE,
      ChapterKind.COPYRIGHT,
      ChapterKind.DEDICATION,
      ChapterKind.CHAPTER,
      ChapterKind.EPILOGUE,
    ]);
    // Copyright text is preserved as editable customText.
    const cr = chapters.find((c) => c.kind === ChapterKind.COPYRIGHT);
    expect((cr?.data as { customText?: string })?.customText).toContain('2026');
  });

  it('classifies sections styled as plain paragraphs (the DOCX/PDF case)', () => {
    // No `heading` blocks at all — section titles are centered/bold paragraphs.
    const blocks: ContentBlock[] = [
      { kind: 'para', text: 'The Great Novel' },
      { kind: 'para', text: 'by Jane Doe' },
      { kind: 'para', text: 'Copyright © 2026 Jane Doe' },
      { kind: 'para', text: 'All rights reserved.' },
      { kind: 'para', text: 'Dedication' },
      { kind: 'para', text: 'For my family.' },
      { kind: 'para', text: 'Prologue' },
      { kind: 'para', text: 'Before it all began.' },
      { kind: 'para', text: 'Chapter One' },
      { kind: 'para', text: 'The story starts here.' },
      { kind: 'para', text: 'Epilogue' },
      { kind: 'para', text: 'And so it ended.' },
    ];
    const { chapters, title, author } = assembleSections(blocks);
    expect(title).toBe('The Great Novel');
    expect(author).toBe('Jane Doe');
    expect(chapters.map((c) => c.kind)).toEqual([
      ChapterKind.TITLE_PAGE,
      ChapterKind.COPYRIGHT,
      ChapterKind.DEDICATION,
      ChapterKind.PROLOGUE,
      ChapterKind.CHAPTER,
      ChapterKind.EPILOGUE,
    ]);
    const cr = chapters.find((c) => c.kind === ChapterKind.COPYRIGHT);
    expect((cr?.data as { customText?: string })?.customText).toContain('All rights reserved');
    const prologue = chapters.find((c) => c.kind === ChapterKind.PROLOGUE);
    expect(prologue?.blocks.some((b) => b.text.includes('Before it all began'))).toBe(true);
  });

  it('does not mistake prose starting with a keyword for a section', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'Chapter 1' },
      { kind: 'para', text: 'Part of me wanted to leave, but the introduction had only begun.' },
    ];
    const { chapters } = assembleSections(blocks);
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.kind).toBe(ChapterKind.CHAPTER);
  });

  it('folds sub-headings into the chapter body; captures a subtitle', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'Chapter 1' },
      { kind: 'heading', level: 2, text: 'The Beginning' },
      { kind: 'para', text: 'Opening.' },
      { kind: 'heading', level: 2, text: 'A Subsection' },
      { kind: 'para', text: 'More.' },
      { kind: 'heading', level: 1, text: 'Chapter 2' },
      { kind: 'para', text: 'Second.' },
    ];
    const { chapters } = assembleSections(blocks);
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.subtitle).toBe('The Beginning');
    expect(chapters[0]?.blocks.some((b) => b.text === 'A Subsection')).toBe(true);
  });

  it('falls back to shallowest heading split when nothing is recognized', () => {
    const blocks: ContentBlock[] = [
      { kind: 'heading', level: 1, text: 'A Title' },
      { kind: 'para', text: 'one' },
      { kind: 'heading', level: 1, text: 'Another Title' },
      { kind: 'para', text: 'two' },
    ];
    expect(assembleSections(blocks).chapters).toHaveLength(2);
  });
});

describe('parseTxt / parseMarkdown → assembleSections', () => {
  it('txt: chapter + subtitle, no over-split on subsections', () => {
    const txt = ['Chapter 1', 'The Start', '', 'Some prose.', '', 'A Subsection', '', 'More.', '', 'Chapter 2', '', 'Next.'].join('\n');
    const { chapters } = assembleSections(parseTxt(Buffer.from(txt)));
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.subtitle).toBe('The Start');
  });
  it('markdown: immediate subheading is a subtitle', () => {
    const { chapters } = assembleSections(parseMarkdown(Buffer.from('# Chapter 1\n## A Scene\n\nText.\n\n# Chapter 2\n\nMore.')));
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.subtitle).toBe('A Scene');
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
  it('computeStats aggregates', () => {
    expect(countWords('one two three')).toBe(3);
    const stats = computeStats([
      { kind: ChapterKind.CHAPTER, title: 'Chapter 1', subtitle: 'Intro', blocks: [{ kind: 'para', text: 'a b c' }] },
    ]);
    expect(stats.wordCount).toBeGreaterThanOrEqual(5);
  });
  it('textToBlocks detects section headings', () => {
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
    expect(doc.content[0]?.type).toBe('heading');
    expect(doc.content[1]?.type).toBe('paragraph');
  });
  it('chapterText flattens blocks', () => {
    expect(chapterText({ kind: ChapterKind.CHAPTER, title: 'C', blocks: [{ kind: 'para', text: 'x y' }] })).toBe('x y');
  });
});
