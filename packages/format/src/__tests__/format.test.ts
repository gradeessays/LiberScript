import { describe, expect, it } from 'vitest';
import { tiptapToHtml } from '../tiptap-html';
import { getTheme, THEMES, DEFAULT_THEME_KEY } from '../themes';
import { renderBookDocument, renderChapter, themeCss } from '../render';
import { CHAPTER_STYLES, chapterHeadingHtml, chapterStyleCss, getChapterStyle } from '../chapter-styles';
import {
  OPENING_QUOTE_STYLES,
  BLOCKQUOTE_STYLES,
  openingQuoteCss,
  blockQuoteCss,
} from '../prose-styles';

const sampleDoc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Once upon a time.' }] },
    { type: 'horizontalRule' },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      ],
    },
  ],
};

describe('tiptapToHtml', () => {
  it('renders paragraphs, marks, and scene breaks', () => {
    const html = tiptapToHtml(sampleDoc);
    expect(html).toContain('<p>Once upon a time.</p>');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('class="scene-break"');
  });
  it('escapes HTML', () => {
    const html = tiptapToHtml({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '<x> & "y"' }] }],
    });
    expect(html).toContain('&lt;x&gt; &amp; &quot;y&quot;');
  });
  it('handles empty/invalid docs', () => {
    expect(tiptapToHtml(null)).toBe('');
    expect(tiptapToHtml({ type: 'doc' })).toBe('');
  });
});

describe('themes', () => {
  it('has genre presets and a working default', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(5);
    expect(getTheme(undefined).key).toBe(DEFAULT_THEME_KEY);
    expect(getTheme('nope').key).toBe(DEFAULT_THEME_KEY);
    expect(getTheme('poetry').genre).toBe('poetry');
  });
  it('marks at least one premium theme', () => {
    expect(THEMES.some((t) => t.premium)).toBe(true);
  });
});

describe('renderChapter / themeCss', () => {
  it('renders chapter title, subtitle, and body', () => {
    const html = renderChapter(getTheme('novel-classic'), {
      index: 1,
      title: 'Chapter 1',
      subtitle: 'The Start',
      content: sampleDoc,
    });
    expect(html).toContain('chapter-title">Chapter 1');
    expect(html).toContain('chapter-subtitle">The Start');
    expect(html).toContain('chapter-body');
  });
  it('emits drop-cap CSS for themes that use it', () => {
    expect(themeCss(getTheme('novel-classic'), 'print')).toContain('::first-letter');
    expect(themeCss(getTheme('selfhelp'), 'print')).not.toContain('::first-letter');
  });
  it('uses page geometry for print and reflow for ebook', () => {
    expect(themeCss(getTheme('selfhelp'), 'print')).toContain('@page');
    expect(themeCss(getTheme('selfhelp'), 'ebook')).toContain('max-width');
  });
  it('applies page-break rules (new page / recto)', () => {
    const recto = themeCss(getTheme('selfhelp'), 'print', undefined, { newPage: true, recto: true });
    expect(recto).toContain('break-before: right');
    const none = themeCss(getTheme('selfhelp'), 'print', undefined, { newPage: false });
    expect(none).toContain('break-before: auto');
  });
});

describe('running headers & page numbers (print)', () => {
  const meta = { title: 'My Book', author: 'A. Writer' };
  it('emits folios, a verso book title, and a per-chapter recto header', () => {
    const html = renderBookDocument({
      theme: getTheme('novel-classic'),
      target: 'print',
      watermark: false,
      meta,
      chapters: [{ index: 1, title: 'One', content: sampleDoc }],
      typography: { headerVersoContent: 'bookTitle', headerRectoContent: 'chapterTitle' },
    });
    expect(html).toContain('counter(page)');
    expect(html).toContain('string-set: chaptertitle');
    expect(html).toContain('content: string(chaptertitle)');
    expect(html).toContain('content: "My Book"');
  });
  it('omits headers/folios when disabled, and never in ebook', () => {
    const off = renderBookDocument({
      theme: getTheme('novel-classic'),
      target: 'print',
      watermark: false,
      meta,
      chapters: [{ index: 1, title: 'One', content: sampleDoc }],
      typography: { pageNumbers: false, runningHeaders: false },
    });
    expect(off).not.toContain('counter(page)');
    const ebook = renderBookDocument({
      theme: getTheme('novel-classic'),
      target: 'ebook',
      watermark: false,
      meta,
      chapters: [{ index: 1, title: 'One', content: sampleDoc }],
    });
    expect(ebook).not.toContain('@page :left');
  });
});

describe('chapter styles', () => {
  it('provides 50+ chapter-start designs', () => {
    expect(CHAPTER_STYLES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(CHAPTER_STYLES.map((s) => s.key)).size).toBe(CHAPTER_STYLES.length); // unique keys
  });
  it('formats numbers per style (roman, word, chapter-N)', () => {
    const roman = getChapterStyle('num-roman-center')!;
    expect(chapterHeadingHtml(roman, { index: 4, title: 'X' })).toContain('IV');
    const word = getChapterStyle('big-word')!;
    expect(chapterHeadingHtml(word, { index: 21, title: 'X' })).toContain('Twenty-One');
    const chap = getChapterStyle('chapter-arabic-center')!;
    expect(chapterHeadingHtml(chap, { index: 3, title: 'X' })).toContain('Chapter 3');
  });
  it('renders chapter style + opening quote via renderChapter', () => {
    const html = renderChapter(
      getTheme('novel-classic'),
      { index: 1, title: 'Ch', content: { type: 'doc', content: [] }, openingQuote: 'To be.', openingQuoteAttribution: 'Bard' },
      getChapterStyle('orn-above-0'),
    );
    expect(html).toContain('chapter-opening-quote');
    expect(html).toContain('Bard');
  });
  it('renders divider, frame and spacing styles', () => {
    const theme = getTheme('novel-classic');
    const orn = getChapterStyle('div-orn-fleuron')!;
    expect(chapterHeadingHtml(orn, { index: 1, title: 'X' })).toContain('cs-div-ornament');
    expect(chapterStyleCss(orn, theme)).toContain('cs-div-ornament::before');
    const tapered = getChapterStyle('div-tapered')!;
    expect(chapterHeadingHtml(tapered, { index: 1, title: 'X' })).toContain('cs-div-tapered');
    const boxed = getChapterStyle('frame-box')!;
    expect(chapterStyleCss(boxed, theme)).toContain('border:1.5px solid currentColor');
    const sunk = getChapterStyle('sunk-plain')!;
    expect(chapterStyleCss(sunk, theme)).toContain('12%');
  });
});

describe('prose styles (opening quotes & block quotes)', () => {
  const theme = getTheme('novel-classic');
  it('offers multiple opening-quote and block-quote variations', () => {
    expect(OPENING_QUOTE_STYLES.length).toBeGreaterThanOrEqual(10);
    expect(BLOCKQUOTE_STYLES.length).toBeGreaterThanOrEqual(6);
  });
  it('emits CSS per chosen style and defaults safely', () => {
    expect(openingQuoteCss('box', theme)).toContain('border:1px solid currentColor');
    expect(openingQuoteCss('hairlines', theme)).toContain('border-top:1px solid currentColor');
    expect(openingQuoteCss(undefined, theme)).toContain('text-align:center'); // default centered
    expect(blockQuoteCss('thick-bar', theme)).toContain('border-left:6px solid currentColor');
    expect(blockQuoteCss('box', theme)).toContain('border:1px solid');
    expect(blockQuoteCss(undefined, theme)).toContain('border-left:3px solid'); // default left rule
  });
  it('applies the chosen styles inside renderBookDocument', () => {
    const html = renderBookDocument({
      theme,
      target: 'ebook',
      watermark: false,
      meta: { title: 'B' },
      chapters: [{ index: 1, title: 'One', content: sampleDoc }],
      typography: { openingQuoteStyleKey: 'box', blockQuoteStyleKey: 'thick-bar' },
    });
    expect(html).toContain('border:1px solid currentColor'); // opening-quote box
    expect(html).toContain('border-left:6px solid currentColor'); // blockquote thick bar
  });
});

describe('renderBookDocument', () => {
  const base = {
    theme: getTheme('novel-classic'),
    meta: { title: 'My Book', author: 'A. Writer', publisherName: 'Indie Press' },
    chapters: [{ index: 1, title: 'Chapter 1', content: sampleDoc }],
  };
  it('includes front matter and shows watermark when free', () => {
    const html = renderBookDocument({ ...base, target: 'ebook', watermark: true });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Indie Press');
    expect(html).toContain('Made with Liberscript');
  });
  it('omits watermark for paid', () => {
    const html = renderBookDocument({ ...base, target: 'print', watermark: false });
    expect(html).not.toContain('Made with Liberscript');
  });
});
