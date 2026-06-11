import {
  ChapterKind,
  generateCopyright,
  groupOfKind,
  KDP_TRIM_SIZES,
  KIND_LABELS,
  type BookGenre,
  type HeaderContent,
  type TypographyOverrides,
} from '@liberscript/core';
import { tiptapToHtml } from './tiptap-html';
import { FONTS } from './themes';
import {
  chapterHeadingHtml,
  chapterStyleCss,
  getChapterStyle,
  type ChapterStartStyle,
} from './chapter-styles';
import { blockQuoteCss, openingQuoteCss } from './prose-styles';
import type {
  BookElement,
  BookMeta,
  BookTheme,
  RenderChapter,
  RenderTarget,
  TocEntry,
} from './types';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Google Fonts stylesheet href for a theme's body + heading fonts (preview). */
export function googleFontsHref(theme: BookTheme): string | null {
  const families = [theme.bodyFont.google, theme.headingFont.google].filter(Boolean);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}

/** Apply per-book typography overrides on top of a theme. */
export function applyTypography(theme: BookTheme, o?: TypographyOverrides): BookTheme {
  if (!o) return theme;
  const fonts = FONTS as Record<string, BookTheme['bodyFont']>;
  const trim =
    o.trimKey === 'custom' && o.customTrim
      ? o.customTrim
      : o.trimKey
        ? (KDP_TRIM_SIZES.find((t) => t.key === o.trimKey) ?? theme.trim)
        : theme.trim;
  return {
    ...theme,
    bodyFont: (o.bodyFontKey && fonts[o.bodyFontKey]) || theme.bodyFont,
    headingFont: (o.headingFontKey && fonts[o.headingFontKey]) || theme.headingFont,
    baseFontPt: o.fontScalePct ? (theme.baseFontPt * o.fontScalePct) / 100 : theme.baseFontPt,
    lineHeight: o.lineHeight ?? theme.lineHeight,
    trim: { widthIn: trim.widthIn, heightIn: trim.heightIn },
    marginsIn: o.marginsIn
      ? {
          top: o.marginsIn.top ?? theme.marginsIn.top,
          bottom: o.marginsIn.bottom ?? theme.marginsIn.bottom,
          inner: o.marginsIn.inner ?? theme.marginsIn.inner,
          outer: o.marginsIn.outer ?? theme.marginsIn.outer,
        }
      : theme.marginsIn,
    paragraph: o.blockParagraphs
      ? {
          ...theme.paragraph,
          indentEm: 0,
          spacingEm: o.paragraphSpacingEm ?? 0.8,
          firstParaPlain: true,
        }
      : {
          ...theme.paragraph,
          spacingEm: o.paragraphSpacingEm ?? theme.paragraph.spacingEm,
        },
  };
}

function sceneBreakCss(theme: BookTheme): string {
  const sb = theme.sceneBreak;
  if (sb.style === 'blank') return `.book .scene-break { height: 1.6em; }`;
  if (sb.style === 'rule')
    return `.book .scene-break { margin: 1.2em auto; width: 18%; border-top: 1px solid currentColor; opacity: 0.5; }`;
  const glyph = sb.style === 'asterism' ? (sb.glyph ?? '* * *') : (sb.glyph ?? '◆');
  return `.book .scene-break { text-align: center; margin: 1.2em 0; letter-spacing: 0.4em; }
.book .scene-break::after { content: "${glyph}"; opacity: 0.7; }`;
}

function chapterStartCss(theme: BookTheme): string {
  const cs = theme.chapterStart;
  const align = cs.align === 'center' ? 'center' : 'left';
  let css = `.book .chapter-heading { text-align: ${align}; margin: 0 0 1.6em; }
.book .chapter-title { font-family: ${theme.headingFont.stack}; font-weight: 700; font-size: 1.8em; margin: 0; }
.book .chapter-subtitle { font-family: ${theme.headingFont.stack}; font-style: italic; color: #444; margin-top: 0.3em; }
.book .chapter-ornament, .book .chapter-number { font-family: ${theme.headingFont.stack}; }`;
  if (cs.style === 'rule')
    css += `\n.book .chapter-title { border-bottom: 2px solid currentColor; padding-bottom: 0.3em; display: inline-block; }`;
  if (cs.style === 'ornament')
    css += `\n.book .chapter-ornament { font-size: 1.6em; opacity: 0.7; margin-bottom: 0.4em; }`;
  if (cs.style === 'number')
    css += `\n.book .chapter-number { font-size: 2.6em; font-weight: 800; line-height: 1; color: #999; margin-bottom: 0.1em; }`;
  if (cs.dropCap)
    css += `\n.book .chapter-body > p:first-of-type::first-letter { float: left; font-family: ${theme.headingFont.stack}; font-size: 3.4em; line-height: 0.78; padding: 0.02em 0.08em 0 0; font-weight: 700; }`;
  if (cs.smallCapsFirstLine)
    css += `\n.book .chapter-body > p:first-of-type::first-line { font-variant: small-caps; letter-spacing: 0.02em; }`;
  return css;
}

function frontMatterCss(theme: BookTheme): string {
  return `.book .title-page { text-align: center; padding-top: 26%; }
.book .title-page .book-title { font-family: ${theme.headingFont.stack}; font-size: 2.4em; font-weight: 800; line-height: 1.1; }
.book .title-page .book-subtitle { font-family: ${theme.headingFont.stack}; font-size: 1.2em; font-style: italic; color: #444; margin-top: 0.6em; }
.book .title-page .book-author { margin-top: 1.4em; font-size: 1.2em; }
.book .title-page .book-publisher { margin-top: 3em; font-size: 0.95em; color: #555; }
.book .title-page .publisher-logo { max-height: 60px; margin: 0 auto 0.6em; display: block; }
.book .copyright-page { font-size: 0.8em; color: #222; line-height: 1.5; }
.book .copyright-page.auto-fit { font-size: 0.72em; }
.book .copyright-page p { text-indent: 0; margin: 0 0 0.7em; }
.book .copyright-page.cp-center { text-align: center; }
.book .copyright-page.cp-left { text-align: left; }
.book .copyright-page .published-by { margin-top: 1.4em; }
.book .copyright-page .publisher-logo { max-height: 44px; margin-bottom: 0.4em; }
.book .copyright-page .watermark { margin-top: 1.4em; color: #888; font-style: italic; }
.book .epigraph { padding-top: 28%; }
.book .epigraph.eg-centered { text-align: center; font-style: italic; }
.book .epigraph.eg-bordered { border-left: 3px solid #ccc; padding-left: 1.2em; font-style: italic; }
.book .epigraph.eg-large { text-align: center; font-size: 1.3em; font-style: italic; }
.book .epigraph .attribution { margin-top: 1em; font-style: normal; font-variant: small-caps; color: #555; }
.book .dedication { text-align: center; font-style: italic; padding-top: 30%; }
/* Centered front matter must not inherit the body paragraph indent. */
.book .epigraph p, .book .dedication p, .book .title-page p { text-indent: 0; margin: 0 0 0.6em; }
/* Foreword / Preface / Prologue / Introduction / back-matter prose headings. */
.book .prose-section h1 { text-align: center; font-size: 1.7em; font-weight: 700; margin: 0 0 0.6em; line-height: 1.15; }
.book .prose-section .chapter-subtitle { text-align: center; }
.book .prose-section .chapter-body > p:first-of-type { text-indent: 0; }
.book .toc h1, .book .part h1, .book .prose-section h1 { font-family: ${theme.headingFont.stack}; }
.book .toc h1 { text-align: center; margin-bottom: 1.4em; }
.book .toc ol { list-style: none; padding: 0; margin: 0; }
.book .toc li { padding: 0.25em 0; border-bottom: 1px dotted #ddd; }
.book .toc a { display: flex; justify-content: space-between; align-items: baseline; gap: 0.6em; width: 100%; text-decoration: none; color: inherit; }
.book .part { text-align: center; padding-top: 34%; }
.book .part h1 { font-size: 2.4em; font-weight: 800; }`;
}

/** Page-break behavior for chapters/sections (print only). */
export interface PageBreakRule {
  /** Each chapter/section starts on a fresh page. Default true. */
  newPage?: boolean;
  /** Start chapters/sections on a right-hand (odd) page. */
  recto?: boolean;
}

function cssString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Running-header / page-number rules using CSS Paged Media (`@page` margin boxes,
 * `string-set`, `counter(page)`). Applied for the print target; rendered by the
 * paged.js / Chromium print pipeline (no effect in the scrolling screen preview).
 */
export function pagedMediaCss(meta: BookMeta, theme: BookTheme, o?: TypographyOverrides): string {
  const pageNumbers = o?.pageNumbers !== false;
  const headers = o?.runningHeaders !== false;
  const placement = o?.pageNumberPlacement ?? 'bottom-center';
  const headFont = `font-family: ${theme.headingFont.stack}; font-size: 9pt; font-style: italic; letter-spacing: 0.02em;`;
  const numFont = `font-family: ${theme.bodyFont.stack}; font-size: 9pt;`;

  const headerValue = (c: HeaderContent | undefined, fallback: HeaderContent): string => {
    const k = c ?? fallback;
    if (k === 'chapterTitle') return 'string(chaptertitle)';
    if (k === 'author') return meta.author ? cssString(meta.author) : '""';
    if (k === 'bookTitle') return cssString(meta.title);
    return 'none';
  };
  const verso = headerValue(o?.headerVersoContent, 'bookTitle');
  const recto = headerValue(o?.headerRectoContent, 'chapterTitle');

  // Folio placement → which margin box holds counter(page).
  const folio = (side: 'left' | 'right'): string => {
    if (!pageNumbers) return '';
    const box =
      placement === 'bottom-center'
        ? '@bottom-center'
        : placement === 'top-outer'
          ? side === 'left'
            ? '@top-left'
            : '@top-right'
          : side === 'left'
            ? '@bottom-left'
            : '@bottom-right';
    return `${box} { content: counter(page); ${numFont} }`;
  };

  return `
.book .chapter-title { string-set: chaptertitle content(text); }
.book .part h1 { string-set: chaptertitle content(text); }
.book .prose-section h1 { string-set: chaptertitle content(text); }
@page :left { ${headers && verso !== 'none' ? `@top-center { content: ${verso}; ${headFont} }` : ''} ${folio('left')} }
@page :right { ${headers && recto !== 'none' ? `@top-center { content: ${recto}; ${headFont} }` : ''} ${folio('right')} }`;
}

/** Stylesheet for a theme + render target. */
export function themeCss(
  theme: BookTheme,
  target: RenderTarget,
  style?: ChapterStartStyle,
  breaks?: PageBreakRule,
  /** Print only: let `@page` own the geometry (paged.js paginates into pages). */
  paginated?: boolean,
): string {
  const p = theme.paragraph;
  const { widthIn: pageW, heightIn: pageH } = theme.trim;
  const bb = breaks?.newPage === false ? 'auto' : breaks?.recto ? 'right' : 'page';
  const base = `.book {
  font-family: ${theme.bodyFont.stack};
  font-size: ${theme.baseFontPt}pt;
  line-height: ${theme.lineHeight};
  color: #111;
  hyphens: ${p.justify ? 'auto' : 'manual'};
}
.book p { margin: 0 0 ${p.spacingEm}em; text-indent: ${p.indentEm}em; text-align: ${p.justify ? 'justify' : 'left'}; }
${p.firstParaPlain ? '.book .chapter-body > p:first-of-type { text-indent: 0; }' : ''}
.book h2 { font-family: ${theme.headingFont.stack}; font-size: 1.3em; margin: 1.4em 0 0.5em; }
.book h3 { font-family: ${theme.headingFont.stack}; font-size: 1.12em; margin: 1.2em 0 0.4em; }
.book ul, .book ol { margin: 0 0 1em 1.5em; }
${style ? chapterStyleCss(style, theme) : chapterStartCss(theme)}
${sceneBreakCss(theme)}
${frontMatterCss(theme)}`;

  // Paginated: @page owns size + margins (paged.js draws real pages); the .book
  // box just resets. Non-paginated: .book is a single tall page-shaped surface.
  const bookBox = paginated
    ? `.book { margin: 0; background: #fff; }`
    : `.book { width: ${pageW}in; min-height: ${pageH}in; margin: 0 auto; padding: ${theme.marginsIn.top}in ${theme.marginsIn.outer}in ${theme.marginsIn.bottom}in ${theme.marginsIn.inner}in; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.12); box-sizing: border-box; }`;
  const print = `@page { size: ${pageW}in ${pageH}in; margin: ${theme.marginsIn.top}in ${theme.marginsIn.outer}in ${theme.marginsIn.bottom}in ${theme.marginsIn.inner}in; }
${bookBox}
.book .chapter, .book .part, .book .frontmatter, .book .prose-section { break-before: ${bb}; }
.book > *:first-child { break-before: avoid; }`;
  const ebook = `.book { max-width: 38rem; margin: 0 auto; padding: 1.5rem; background: #fff; }
.book .chapter, .book .part, .book .frontmatter, .book .prose-section { break-before: auto; padding-top: 1.5rem; }
.book .epigraph, .book .dedication, .book .title-page, .book .copyright-page { padding-top: 1.5rem; }`;
  return `${base}\n${target === 'print' ? print : ebook}`;
}

function defaultHeading(theme: BookTheme, chapter: RenderChapter): string {
  const cs = theme.chapterStart;
  const ornament =
    cs.style === 'ornament' && cs.ornament ? `<div class="chapter-ornament">${cs.ornament}</div>` : '';
  const number = cs.style === 'number' ? `<div class="chapter-number">${chapter.index}</div>` : '';
  const subtitle = chapter.subtitle ? `<div class="chapter-subtitle">${esc(chapter.subtitle)}</div>` : '';
  return `<header class="chapter-heading">${ornament}${number}<h1 class="chapter-title">${esc(chapter.title)}</h1>${subtitle}</header>`;
}

/** Shared opening-quote block (epigraph that opens a chapter/section). */
function openingQuoteHtml(quote?: string | null, attr?: string | null): string {
  if (!quote) return '';
  return `<div class="chapter-opening-quote">${esc(quote)}${
    attr ? `<div class="attr">— ${esc(attr)}</div>` : ''
  }</div>`;
}

/** Render a single body chapter, honoring the selected chapter-start style. */
export function renderChapter(
  theme: BookTheme,
  chapter: RenderChapter,
  style?: ChapterStartStyle,
): string {
  const heading = style
    ? chapterHeadingHtml(style, {
        index: chapter.index,
        title: chapter.title,
        subtitle: chapter.subtitle,
      })
    : defaultHeading(theme, chapter);
  const oq = openingQuoteHtml(chapter.openingQuote, chapter.openingQuoteAttribution);
  return `<section class="chapter">
  ${heading}${oq}
  <div class="chapter-body">${tiptapToHtml(chapter.content)}</div>
</section>`;
}

function dataStr(data: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = data?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function renderTitlePage(meta: BookMeta, el: BookElement): string {
  // el.title is the element's outline label ("Title Page") — never print it.
  // The real title comes from the title-page form data or the book metadata.
  const title = dataStr(el.data, 'title') || meta.title;
  const subtitle = dataStr(el.data, 'subtitle') || el.subtitle;
  const author = dataStr(el.data, 'author') || meta.author;
  const publisher = dataStr(el.data, 'publisher') || meta.publisherName;
  const logo = meta.logoUrl
    ? `<img class="publisher-logo" src="${esc(meta.logoUrl)}" alt="${esc(publisher ?? 'Publisher')}" />`
    : '';
  return `<section class="frontmatter title-page">
  <div class="book-title">${esc(title)}</div>
  ${subtitle ? `<div class="book-subtitle">${esc(subtitle)}</div>` : ''}
  ${author ? `<div class="book-author">${esc(author)}</div>` : ''}
  ${publisher ? `<div class="book-publisher">${logo}${esc(publisher)}</div>` : ''}
</section>`;
}

function renderCopyright(meta: BookMeta, el: BookElement, watermark: boolean): string {
  const custom = dataStr(el.data, 'customText');
  const publisher = dataStr(el.data, 'publisher') || meta.publisherName;
  const isbn = dataStr(el.data, 'isbn');
  const logo = meta.logoUrl ? `<img class="publisher-logo" src="${esc(meta.logoUrl)}" alt="" />` : '';
  const mark = watermark ? `<p class="watermark">Made with Liberscript — liberscript.app</p>` : '';

  let body: string;
  if (custom) {
    body = custom
      .split(/\n{2,}/)
      .map((para) => `<p>${esc(para.trim())}</p>`)
      .join('');
  } else {
    const cr = generateCopyright({
      title: meta.title,
      author: dataStr(el.data, 'author') || meta.author,
      year: Number(el.data?.year) || undefined,
      genre: (dataStr(el.data, 'genre') as BookGenre) || undefined,
    });
    body = `<p>${esc(meta.title)}</p><p>${esc(cr.copyrightLine)}</p><p>${esc(cr.rightsLine)}</p>${
      cr.disclaimer ? `<p>${esc(cr.disclaimer)}</p>` : ''
    }`;
  }

  const publishedBy = publisher
    ? `<div class="published-by">${logo}<p>Published by ${esc(publisher)}</p></div>`
    : '';
  const isbnLine = `<p>ISBN: ${isbn ? esc(isbn) : '_____________'}</p>`;
  // Centered by default (the common title-verso look); 'left' is opt-in.
  const align = dataStr(el.data, 'align') === 'left' ? 'cp-left' : 'cp-center';

  return `<section class="frontmatter copyright-page auto-fit ${align}">
  ${body}
  ${publishedBy}
  ${isbnLine}
  ${mark}
</section>`;
}

function renderEpigraph(el: BookElement): string {
  const style = dataStr(el.data, 'style') ?? 'centered';
  const attribution = dataStr(el.data, 'attribution');
  return `<section class="frontmatter epigraph eg-${esc(style)}">
  <div class="epigraph-quote">${tiptapToHtml(el.content)}</div>
  ${attribution ? `<div class="attribution">— ${esc(attribution)}</div>` : ''}
</section>`;
}

function renderToc(entries: TocEntry[]): string {
  // Page numbers are NOT rendered inline — in the paginated print pipeline a
  // target-counter(attr(href), page) rule fills them in from real pagination.
  const items = entries
    .map(
      (e) =>
        `<li><a${e.href ? ` href="${e.href}"` : ''}><span class="toc-t">${esc(e.title)}</span></a></li>`,
    )
    .join('');
  return `<section class="frontmatter toc"><h1>Contents</h1><ol>${items}</ol></section>`;
}

function renderProseSection(el: BookElement, cls: string, defaultTitle: string): string {
  const title = el.title || defaultTitle;
  const isDedication = cls === 'dedication';
  const sectionClass = isDedication ? 'frontmatter dedication' : `frontmatter prose-section ${cls}`;
  const heading = isDedication ? '' : `<h1>${esc(title)}</h1>`;
  // Prologue / Introduction / Foreword … support an optional subtitle and an
  // opening quote, just like a chapter.
  const subtitle =
    !isDedication && el.subtitle ? `<div class="chapter-subtitle">${esc(el.subtitle)}</div>` : '';
  const oq = isDedication
    ? ''
    : openingQuoteHtml(dataStr(el.data, 'openingQuote'), dataStr(el.data, 'openingQuoteAttribution'));
  return `<section class="${sectionClass}">${heading}${subtitle}${oq}<div class="chapter-body">${tiptapToHtml(el.content)}</div></section>`;
}

function renderPart(el: BookElement): string {
  return `<section class="part"><h1>${esc(el.title || 'Part')}</h1>${
    el.subtitle ? `<div class="chapter-subtitle">${esc(el.subtitle)}</div>` : ''
  }</section>`;
}

interface ElementCtx {
  meta: BookMeta;
  watermark: boolean;
  toc: TocEntry[];
  chapterIndex: number;
  style?: ChapterStartStyle;
}

function renderElement(theme: BookTheme, el: BookElement, ctx: ElementCtx): string {
  switch (el.kind) {
    case ChapterKind.TITLE_PAGE:
      return renderTitlePage(ctx.meta, el);
    case ChapterKind.COPYRIGHT:
      return renderCopyright(ctx.meta, el, ctx.watermark);
    case ChapterKind.EPIGRAPH:
      return renderEpigraph(el);
    case ChapterKind.DEDICATION:
      return renderProseSection(el, 'dedication', 'Dedication');
    case ChapterKind.TOC:
      return renderToc(ctx.toc);
    case ChapterKind.PART:
      return renderPart(el);
    case ChapterKind.FOREWORD:
    case ChapterKind.PREFACE:
    case ChapterKind.PROLOGUE:
    case ChapterKind.INTRODUCTION:
    case ChapterKind.EPILOGUE:
    case ChapterKind.AFTERWORD:
    case ChapterKind.ACKNOWLEDGMENTS:
    case ChapterKind.ABOUT_AUTHOR:
    case ChapterKind.ALSO_BY:
    case ChapterKind.APPENDIX:
      return renderProseSection(
        el,
        groupOfKind(el.kind as ChapterKind) === 'back' ? 'backmatter' : 'prologue',
        KIND_LABELS[el.kind as keyof typeof KIND_LABELS] ?? 'Section',
      );
    case ChapterKind.CHAPTER:
    default:
      return renderChapter(
        theme,
        {
          index: ctx.chapterIndex,
          title: el.title || 'Chapter',
          subtitle: el.subtitle,
          openingQuote: dataStr(el.data, 'openingQuote'),
          openingQuoteAttribution: dataStr(el.data, 'openingQuoteAttribution'),
          content: el.content,
        },
        ctx.style,
      );
  }
}

/** Title + copyright front matter (legacy helper retained for callers/tests). */
export function renderFrontMatter(meta: BookMeta, watermark: boolean): string {
  return (
    renderTitlePage(meta, { kind: ChapterKind.TITLE_PAGE }) +
    renderCopyright(meta, { kind: ChapterKind.COPYRIGHT }, watermark)
  );
}

export type ReadingMode = 'light' | 'sepia' | 'dark';

const READING_MODE: Record<ReadingMode, { page: string; book: string; text: string }> = {
  light: { page: '#fafafa', book: '#ffffff', text: '#111111' },
  sepia: { page: '#efe6d2', book: '#faf3e0', text: '#3a2f25' },
  dark: { page: '#15171a', book: '#1f2226', text: '#e6e6e6' },
};

export interface RenderBookInput {
  theme: BookTheme;
  target: RenderTarget;
  watermark: boolean;
  meta: BookMeta;
  /** Ordered typed elements. If omitted, falls back to `chapters`. */
  elements?: BookElement[];
  /** Legacy: a flat list of chapters (auto-wrapped as CHAPTER elements). */
  chapters?: RenderChapter[];
  typography?: TypographyOverrides;
  includeFrontMatter?: boolean;
  /** Ebook reading theme (ignored for print). */
  readingMode?: ReadingMode;
  /**
   * Print only: paginate into real pages (page 1, 2, 3…) with running headers and
   * folios, via the paged.js polyfill loaded in the preview. The exporters set
   * their own pagination, so this is for the on-screen print preview.
   */
  paginated?: boolean;
  /**
   * Paginated print preview style: `scroll` = PDF-viewer (all pages stacked),
   * `flip` = one page at a time with next/prev navigation. Default `scroll`.
   */
  pageView?: 'scroll' | 'flip';
  /**
   * Whether to embed the paged.js polyfill `<script>` (the in-browser preview).
   * The PDF exporter sets this false: it produces paginated geometry but runs
   * paged.js itself in headless Chromium. Default true when `paginated`.
   */
  injectPagedPolyfill?: boolean;
  /**
   * URL of the paged.js polyfill script. The web app passes its self-hosted
   * copy (no CDN dependency); when set, the pinned unpkg build is kept as an
   * automatic fallback if the primary fails to load.
   */
  pagedPolyfillUrl?: string;
}

const PAGED_POLYFILL_CDN = 'https://unpkg.com/pagedjs@0.4.3/dist/paged.polyfill.js';

/** Full standalone HTML document used by the live preview and the exporters. */
export function renderBookDocument(input: RenderBookInput): string {
  const theme = applyTypography(input.theme, input.typography);
  const { target, watermark, meta } = input;

  const frontMatter: BookElement[] =
    input.includeFrontMatter === false
      ? []
      : [{ kind: ChapterKind.TITLE_PAGE }, { kind: ChapterKind.COPYRIGHT }, { kind: ChapterKind.TOC }];

  const elements: BookElement[] =
    input.elements ?? [
      ...frontMatter,
      ...(input.chapters ?? []).map((c) => ({
        kind: ChapterKind.CHAPTER,
        title: c.title,
        subtitle: c.subtitle,
        content: c.content,
      })),
    ];

  const style = getChapterStyle(input.typography?.chapterStyleKey);
  const breaks: PageBreakRule = {
    newPage: input.typography?.chaptersNewPage,
    recto: input.typography?.sectionsRecto,
  };
  const paginated = !!input.paginated && target === 'print';

  // TOC: link every listed section to its rendered wrapper id so the print
  // pipeline can resolve REAL page numbers via target-counter.
  const TOC_LISTED: ChapterKind[] = [
    ChapterKind.FOREWORD, ChapterKind.PREFACE, ChapterKind.PROLOGUE, ChapterKind.INTRODUCTION,
    ChapterKind.PART, ChapterKind.CHAPTER, ChapterKind.EPILOGUE, ChapterKind.AFTERWORD,
    ChapterKind.ACKNOWLEDGMENTS, ChapterKind.ABOUT_AUTHOR, ChapterKind.ALSO_BY, ChapterKind.APPENDIX,
  ];
  let chapterNo = 0;
  const toc: TocEntry[] = [];
  elements.forEach((el, i) => {
    if (!TOC_LISTED.includes(el.kind as ChapterKind)) return;
    if (el.kind === ChapterKind.CHAPTER) chapterNo += 1;
    toc.push({
      index: el.kind === ChapterKind.CHAPTER ? chapterNo : 0,
      title: el.title || KIND_LABELS[el.kind as keyof typeof KIND_LABELS] || 'Untitled',
      href: `#sec${i}`,
    });
  });

  // Each section gets a wrapper with a UNIQUE named page: paged.js merges
  // consecutive same-named pages, so unique names are what guarantee a real
  // page break between sections — and let us blank headers/folios per section.
  // The `page:` assignment MUST live in the stylesheet: paged.js only parses
  // stylesheets (css-tree), it never reads inline style attributes.
  let idx = 0;
  const body = elements
    .map((el, i) => {
      if (el.kind === ChapterKind.CHAPTER) idx += 1;
      const inner = renderElement(theme, el, { meta, watermark, toc, chapterIndex: idx, style });
      return `<div class="psec" id="sec${i}">${inner}</div>`;
    })
    .join('\n');

  // Pagination rules per section: front-matter furniture pages show no header
  // or folio; chapters/prose sections hide the running header on their opening
  // page only (standard book convention).
  const NO_FURNITURE: ChapterKind[] = [
    ChapterKind.TITLE_PAGE, ChapterKind.COPYRIGHT, ChapterKind.TOC,
    ChapterKind.EPIGRAPH, ChapterKind.DEDICATION, ChapterKind.PART,
  ];
  const blankAll =
    '@top-center { content: none; } @top-left { content: none; } @top-right { content: none; } @bottom-center { content: none; } @bottom-left { content: none; } @bottom-right { content: none; }';
  const blankTop =
    '@top-center { content: none; } @top-left { content: none; } @top-right { content: none; }';
  const bb = breaks.newPage === false ? 'auto' : breaks.recto ? 'right' : 'page';
  const legacyBb = breaks.newPage === false ? 'auto' : breaks.recto ? 'right' : 'always';
  const sectionCss = paginated
    ? `.book .psec { break-before: ${bb}; page-break-before: ${legacyBb}; }
.book .psec:first-child { break-before: avoid; page-break-before: avoid; }
.book .psec .chapter, .book .psec .part, .book .psec .frontmatter, .book .psec .prose-section { break-before: auto; page-break-before: auto; }
.book .toc a::after { content: target-counter(attr(href), page); font-variant-numeric: tabular-nums; }
${elements.map((_, i) => `#sec${i} { page: s${i}; }`).join('\n')}
${elements
  .map((el, i) =>
    NO_FURNITURE.includes(el.kind as ChapterKind)
      ? `@page s${i} { ${blankAll} }`
      : `@page s${i}:first { ${blankTop} }`,
  )
  .join('\n')}`
    : '';

  const fontsHref = googleFontsHref(theme);
  const fontLink = fontsHref ? `<link rel="stylesheet" href="${fontsHref}">` : '';
  const pagedCss = target === 'print' ? pagedMediaCss(meta, theme, input.typography) : '';
  const proseCss = `${openingQuoteCss(input.typography?.openingQuoteStyleKey, theme)}
${blockQuoteCss(input.typography?.blockQuoteStyleKey, theme)}`;

  // Ebook reading mode recolors the page; print always shows a paper surface.
  const rm = target === 'ebook' && input.readingMode ? READING_MODE[input.readingMode] : null;
  // Paginated preview uses the dark PDF-viewer surround; it must be set here
  // (not only in the preview-UI sheet) because paged.js re-injects this
  // stylesheet after that sheet, which would win the cascade otherwise.
  const pageBg = target === 'print' ? (paginated ? '#525659' : '#e9e9ee') : (rm?.page ?? '#fafafa');
  const readingCss = rm
    ? `.book { background: ${rm.book} !important; color: ${rm.text} !important; } .book .chapter-subtitle, .book blockquote { color: ${rm.text}; opacity: 0.8; }`
    : '';

  // paged.js paginates the document into real page boxes honoring the @page /
  // running-header / folio rules. Loaded only for the paginated print preview;
  // the PDF exporter (injectPagedPolyfill: false) runs paged.js in Chromium.
  const previewPaginated = paginated && input.injectPagedPolyfill !== false;
  const flip = previewPaginated && input.pageView === 'flip';
  const previewUiStyle = previewPaginated ? pagedPreviewUiStyle(theme, flip) : '';
  const pagedScript = previewPaginated
    ? pagedPreviewScript(flip, input.pagedPolyfillUrl ?? PAGED_POLYFILL_CDN, input.pagedPolyfillUrl ? PAGED_POLYFILL_CDN : undefined)
    : '';

  // Preview: hand the book to paged.js via its content template — the source
  // never paints (no flash of the unpaginated flow) and the preview chrome we
  // add to <body> (progress chip, flip nav) is not swallowed into the book.
  const bookHtml = `<div class="book">\n${body}\n</div>`;
  const bodyContent = previewPaginated
    ? `<template data-ref="pagedjs-content">${bookHtml}</template>`
    : bookHtml;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
${fontLink}
<style>
html, body { margin: 0; padding: 0; background: ${pageBg}; }
body { padding: ${target === 'print' ? (paginated ? '18px 0' : '24px') : '0'}; }
${themeCss(theme, target, style, breaks, paginated)}
${proseCss}
${pagedCss}
${sectionCss}
${readingCss}
</style>
${previewUiStyle}
</head>
<body class="">
${bodyContent}
${pagedScript}
</body>
</html>`;
}

/**
 * Preview-chrome stylesheet (progress chip, stacked-pages look, flip viewer,
 * fail-open fallback). `media="screen"` + `data-pagedjs-ignore` keep it out of
 * both print output and the paged.js polisher, so paged.js never rewrites it.
 */
function pagedPreviewUiStyle(theme: BookTheme, flip: boolean): string {
  const { widthIn } = theme.trim;
  const m = theme.marginsIn;
  const base = `html, body { background: #525659; }
.pagedjs_pages { display: block; }
.pagedjs_page { background: #fff; box-shadow: 0 2px 18px rgba(0,0,0,0.45); margin: 0 auto 18px; }
.paged-progress { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(20,20,22,0.85); color: #fff; padding: 6px 14px; border-radius: 999px; font: 12px/1.4 system-ui, sans-serif; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.4); }
body.paged-ready .paged-progress, body.paged-failed .paged-progress { display: none; }
/* Fail-open: if paged.js cannot load, the book is restored as a continuous
   page-shaped flow so the preview is never blank. */
body.paged-failed::before { content: "The page-layout engine could not load — showing a continuous preview without page breaks."; display: block; background: #8a4b3b; color: #fff; font: 12px/1.5 system-ui, sans-serif; text-align: center; padding: 6px 12px; }
body.paged-failed .book { width: ${widthIn}in; margin: 16px auto; padding: ${m.top}in ${m.outer}in ${m.bottom}in ${m.inner}in; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.35); box-sizing: border-box; }`;
  const flipCss = flip
    ? `
/* —— flip viewer: one page, fitted to the viewport, real page-turns —— */
body.flip { overflow: hidden; height: 100vh; padding: 0; }
body.flip .pagedjs_pages { position: fixed; left: 50%; transform-origin: top center; perspective: 2800px; }
body.flip .pagedjs_page { display: none; position: absolute; top: 0; left: 0; margin: 0; backface-visibility: hidden; }
body.flip .pagedjs_page.is-current { display: block; }
body.flip .pagedjs_page.turn-out { display: block; z-index: 3; transform-origin: left center; animation: lbs-turn-out 0.45s cubic-bezier(0.25, 0.6, 0.35, 1) both; }
body.flip .pagedjs_page.turn-in { z-index: 3; transform-origin: left center; animation: lbs-turn-in 0.45s cubic-bezier(0.25, 0.6, 0.35, 1) both; }
@keyframes lbs-turn-out { from { transform: rotateY(0deg); opacity: 1; } 60% { opacity: 1; } to { transform: rotateY(-76deg); opacity: 0; } }
@keyframes lbs-turn-in { from { transform: rotateY(-76deg); opacity: 0; } 40% { opacity: 1; } to { transform: rotateY(0deg); opacity: 1; } }
.flip-nav { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; background: rgba(20,20,22,0.82); color: #fff; padding: 6px 10px; border-radius: 999px; font: 14px system-ui, sans-serif; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.4); }
.flip-nav button { background: transparent; color: #fff; border: 0; font-size: 22px; line-height: 1; cursor: pointer; padding: 0 8px; }
.flip-nav button:disabled { opacity: 0.3; cursor: default; }
.flip-nav span { min-width: 64px; text-align: center; }
.flip-zone { position: fixed; top: 0; bottom: 64px; width: 16%; min-width: 56px; border: 0; padding: 0; background: transparent; cursor: pointer; z-index: 9998; display: flex; align-items: center; outline: none; }
.flip-zone span { font: 54px/1 system-ui, sans-serif; color: rgba(255,255,255,0); transition: color 0.15s; user-select: none; }
.flip-zone:hover span, .flip-zone:focus-visible span { color: rgba(255,255,255,0.6); }
.flip-zone-left { left: 0; justify-content: flex-start; padding-left: 10px; }
.flip-zone-right { right: 0; justify-content: flex-end; padding-right: 10px; }`
    : '';
  return `<style media="screen" data-pagedjs-ignore>\n${base}${flipCss}\n</style>`;
}

/**
 * Inline paged.js bootstrap: progress chip while paginating, fail-open if the
 * polyfill can't load (optional CDN fallback first), and — in flip mode — the
 * single-page viewer, initialized only AFTER pagination so hidden pages never
 * break paged.js layout measurement.
 */
function pagedPreviewScript(flip: boolean, src: string, fallbackSrc?: string): string {
  const flipInit = flip
    ? `
function __initFlip(){
  var pages = Array.prototype.slice.call(document.querySelectorAll('.pagedjs_page'));
  var stage = document.querySelector('.pagedjs_pages');
  if(!pages.length || !stage || document.querySelector('.flip-nav')) return;
  var pw = pages[0].offsetWidth, ph = pages[0].offsetHeight;
  var current = 0, busy = false;
  document.body.classList.add('flip');

  // Fit the whole page in the viewport, like a PDF viewer's "fit page".
  function fit(){
    var navH = 64;
    var s = Math.min((window.innerWidth - 32) / pw, (window.innerHeight - navH - 20) / ph);
    stage.style.width = pw + 'px';
    stage.style.height = ph + 'px';
    stage.style.top = Math.max(10, (window.innerHeight - navH - ph * s) / 2) + 'px';
    stage.style.transform = 'translateX(-50%) scale(' + s + ')';
  }

  var nav = document.createElement('div'); nav.className = 'flip-nav';
  var prev = document.createElement('button'); prev.textContent = '\\u2039'; prev.setAttribute('aria-label','Previous page');
  var label = document.createElement('span');
  var next = document.createElement('button'); next.textContent = '\\u203A'; next.setAttribute('aria-label','Next page');
  nav.appendChild(prev); nav.appendChild(label); nav.appendChild(next);
  document.body.appendChild(nav);
  function zone(side){
    var z = document.createElement('button');
    z.className = 'flip-zone flip-zone-' + side;
    z.setAttribute('aria-label', side === 'left' ? 'Previous page' : 'Next page');
    var s = document.createElement('span'); s.textContent = side === 'left' ? '\\u2039' : '\\u203A';
    z.appendChild(s); document.body.appendChild(z); return z;
  }
  var zoneL = zone('left'), zoneR = zone('right');

  function paint(){
    label.textContent = (current + 1) + ' / ' + pages.length;
    prev.disabled = current === 0; next.disabled = current === pages.length - 1;
    zoneL.style.visibility = current === 0 ? 'hidden' : 'visible';
    zoneR.style.visibility = current === pages.length - 1 ? 'hidden' : 'visible';
  }
  function settle(n){
    for(var k = 0; k < pages.length; k++){
      pages[k].classList.remove('turn-out','turn-in');
      pages[k].classList.toggle('is-current', k === n);
    }
    busy = false;
  }
  function go(n){
    n = Math.max(0, Math.min(pages.length - 1, n));
    if(busy || n === current) return;
    busy = true;
    var out = pages[current], inn = pages[n], forward = n > current;
    current = n;
    paint();
    inn.classList.add('is-current'); // both pages visible during the turn
    var turning = forward ? out : inn;
    turning.classList.add(forward ? 'turn-out' : 'turn-in');
    var finished = false;
    var done = function(){ if(finished) return; finished = true; settle(n); };
    turning.addEventListener('animationend', done, { once: true });
    setTimeout(done, 600); // safety: settle even if animationend never fires
  }
  prev.onclick = function(){ go(current - 1); };
  next.onclick = function(){ go(current + 1); };
  zoneL.onclick = function(){ go(current - 1); };
  zoneR.onclick = function(){ go(current + 1); };
  document.addEventListener('keydown', function(e){
    if(e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' '){ e.preventDefault(); go(current + 1); }
    else if(e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); go(current - 1); }
    else if(e.key === 'Home'){ go(0); }
    else if(e.key === 'End'){ go(pages.length - 1); }
  });
  window.addEventListener('resize', fit);
  fit(); settle(0); paint();
}`
    : '';
  const onDone = flip ? 'try { __initFlip(); } catch(e){}' : '';
  return `<script>
window.PagedConfig = { auto: true, after: function(){ window.__pagedDone(); } };
(function(){
  var chip, observer;
  function onReady(fn){ if(document.readyState !== 'loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  onReady(function(){
    chip = document.createElement('div');
    chip.className = 'paged-progress';
    chip.textContent = 'Laying out pages\\u2026';
    document.body.appendChild(chip);
    var pending = false;
    observer = new MutationObserver(function(){
      if(pending) return;
      pending = true;
      requestAnimationFrame(function(){
        pending = false;
        var n = document.querySelectorAll('.pagedjs_page').length;
        if(n && chip) chip.textContent = 'Laying out pages\\u2026 ' + n;
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  function stopProgress(){ if(observer) observer.disconnect(); if(chip){ chip.remove(); chip = null; } }
  window.__pagedDone = function(){
    stopProgress();
    document.body.classList.add('paged-ready');
    ${onDone}
  };
  window.__pagedFailed = function(){
    var b = document.body;
    if(b.classList.contains('paged-ready') || b.classList.contains('paged-failed')) return;
    stopProgress();
    var t = document.querySelector("template[data-ref='pagedjs-content']");
    if(t) b.appendChild(t.content.cloneNode(true));
    b.classList.add('paged-failed');
  };
  window.__pagedScriptError = function(){
    ${
      fallbackSrc
        ? `if(!window.__pagedTriedFallback){
      window.__pagedTriedFallback = true;
      var s = document.createElement('script');
      s.src = ${JSON.stringify(fallbackSrc)};
      s.onerror = function(){ window.__pagedFailed(); };
      document.body.appendChild(s);
      return;
    }
    window.__pagedFailed();`
        : 'window.__pagedFailed();'
    }
  };
  // Watchdog: nothing paginated after 25s → fail open to the continuous view.
  setTimeout(function(){
    if(!document.body.classList.contains('paged-ready') && !document.querySelector('.pagedjs_page')){
      window.__pagedFailed();
    }
  }, 25000);
})();${flipInit}
</script>
<script src="${src}" onerror="window.__pagedScriptError()"></script>`;
}
