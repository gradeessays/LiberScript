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
  it('title page prints the BOOK title, never the element label', () => {
    const html = renderBookDocument({
      theme: getTheme('novel-classic'),
      target: 'print',
      watermark: false,
      meta: { title: 'Unbreakable', author: 'Jack Osborne' },
      elements: [
        { kind: 'TITLE_PAGE', title: 'Title Page' },
        { kind: 'CHAPTER', title: 'Chapter 1', content: sampleDoc },
      ],
    });
    expect(html).toContain('book-title">Unbreakable');
    expect(html).not.toContain('book-title">Title Page');
  });
  it('paginated print: unique named page per section + real TOC page numbers', () => {
    const html = renderBookDocument({
      theme: getTheme('novel-classic'),
      target: 'print',
      watermark: false,
      paginated: true,
      meta: { title: 'Unbreakable' },
      elements: [
        { kind: 'TITLE_PAGE' },
        { kind: 'TOC' },
        { kind: 'CHAPTER', title: 'Chapter 1', content: sampleDoc },
      ],
    });
    expect(html).toContain('id="sec0"');
    // Named pages must be assigned via the STYLESHEET: paged.js only parses
    // stylesheets (css-tree) and never reads inline style attributes.
    expect(html).toContain('#sec0 { page: s0; }');
    expect(html).not.toContain('style="page:');
    expect(html).toContain('@page s0'); // furniture blanked on front matter
    expect(html).toContain('@page s2:first'); // chapter opener: header blanked
    expect(html).toContain('page-break-before: always'); // legacy alias for paged.js
    expect(html).toContain('target-counter(attr(href), page)'); // real TOC numbers
    expect(html).toContain('href="#sec2"'); // TOC links to the chapter
  });
  it('margin overrides flow into the @page geometry', () => {
    const html = renderBookDocument({
      ...base,
      target: 'print',
      watermark: false,
      typography: { marginsIn: { top: 1.25, inner: 0.95 } },
    });
    expect(html).toContain('1.25in');
    expect(html).toContain('0.95in');
  });
  it('centers the copyright page by default, left when set', () => {
    const def = renderBookDocument({ ...base, target: 'print', watermark: false });
    expect(def).toContain('copyright-page auto-fit cp-center');
    const left = renderBookDocument({
      ...base,
      target: 'print',
      watermark: false,
      elements: [{ kind: 'COPYRIGHT', data: { align: 'left' } }],
    });
    expect(left).toContain('cp-left');
  });
  it('loads paged.js + @page geometry only in paginated print mode', () => {
    const paged = renderBookDocument({ ...base, target: 'print', watermark: false, paginated: true });
    expect(paged).toContain('paged.polyfill.js');
    expect(paged).toContain('pagedjs_page');
    // Content is handed to paged.js via its template so the unpaginated source
    // never flashes and preview chrome added to <body> isn't swallowed.
    expect(paged).toContain('data-ref="pagedjs-content"');
    expect(paged).not.toContain('min-height'); // .book no longer owns page geometry
    const flow = renderBookDocument({ ...base, target: 'print', watermark: false });
    expect(flow).not.toContain('paged.polyfill.js');
    expect(flow).toContain('min-height'); // single tall page surface
    const ebook = renderBookDocument({ ...base, target: 'ebook', watermark: false, paginated: true });
    expect(ebook).not.toContain('paged.polyfill.js'); // print-only
  });
  it('adds the page-flip navigator only in flip mode', () => {
    const flip = renderBookDocument({ ...base, target: 'print', watermark: false, paginated: true, pageView: 'flip' });
    expect(flip).toContain('__initFlip');
    expect(flip).toContain('flip-nav');
    expect(flip).toContain('flip-zone'); // edge click zones
    // The flip class is applied only AFTER pagination — hiding pages during
    // layout breaks paged.js overflow measurement (no real page breaks).
    expect(flip).not.toContain('<body class="flip">');
    expect(flip).toContain('<body class="">');
    const scroll = renderBookDocument({ ...base, target: 'print', watermark: false, paginated: true, pageView: 'scroll' });
    expect(scroll).not.toContain('__initFlip');
    expect(scroll).toContain('<body class="">');
  });
  it('resets paragraph indent in centered front matter and styles prose headings', () => {
    const css = themeCss(getTheme('novel-classic'), 'print');
    expect(css).toContain('.book .epigraph p, .book .dedication p, .book .title-page p { text-indent: 0;');
    expect(css).toContain('.book .prose-section h1 { text-align: center;');
  });
  it('renders subtitle + opening quote for prologue/introduction sections', () => {
    const html = renderBookDocument({
      theme: getTheme('novel-classic'),
      target: 'ebook',
      watermark: false,
      meta: { title: 'B' },
      elements: [
        {
          kind: 'PROLOGUE',
          title: 'Prologue',
          subtitle: 'Before it began',
          data: { openingQuote: 'All things end.', openingQuoteAttribution: 'Anon' },
          content: sampleDoc,
        },
      ],
    });
    expect(html).toContain('chapter-subtitle">Before it began');
    expect(html).toContain('chapter-opening-quote');
    expect(html).toContain('All things end.');
    expect(html).toContain('Anon');
  });
});
