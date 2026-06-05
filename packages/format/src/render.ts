import {
  ChapterKind,
  generateCopyright,
  KDP_TRIM_SIZES,
  KIND_LABELS,
  type BookGenre,
  type TypographyOverrides,
} from '@liberscript/core';
import { tiptapToHtml } from './tiptap-html';
import { FONTS } from './themes';
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
  return `.book .frontmatter, .book .backmatter { break-after: page; }
.book .title-page { text-align: center; padding-top: 26%; }
.book .title-page .book-title { font-family: ${theme.headingFont.stack}; font-size: 2.4em; font-weight: 800; line-height: 1.1; }
.book .title-page .book-subtitle { font-family: ${theme.headingFont.stack}; font-size: 1.2em; font-style: italic; color: #444; margin-top: 0.6em; }
.book .title-page .book-author { margin-top: 1.4em; font-size: 1.2em; }
.book .title-page .book-publisher { margin-top: 3em; font-size: 0.95em; color: #555; }
.book .title-page .publisher-logo { max-height: 60px; margin: 0 auto 0.6em; display: block; }
.book .copyright-page { font-size: 0.8em; color: #222; line-height: 1.5; }
.book .copyright-page.auto-fit { font-size: 0.72em; }
.book .copyright-page p { text-indent: 0; margin: 0 0 0.7em; text-align: left; }
.book .copyright-page .published-by { margin-top: 1.4em; }
.book .copyright-page .publisher-logo { max-height: 44px; margin-bottom: 0.4em; }
.book .copyright-page .watermark { margin-top: 1.4em; color: #888; font-style: italic; }
.book .epigraph { padding-top: 28%; }
.book .epigraph.eg-centered { text-align: center; font-style: italic; }
.book .epigraph.eg-bordered { border-left: 3px solid #ccc; padding-left: 1.2em; font-style: italic; }
.book .epigraph.eg-large { text-align: center; font-size: 1.3em; font-style: italic; }
.book .epigraph .attribution { margin-top: 1em; font-style: normal; font-variant: small-caps; color: #555; }
.book .dedication { text-align: center; font-style: italic; padding-top: 30%; }
.book .toc h1, .book .part h1, .book .prose-section h1 { font-family: ${theme.headingFont.stack}; }
.book .toc h1 { text-align: center; margin-bottom: 1.4em; }
.book .toc ol { list-style: none; padding: 0; margin: 0; }
.book .toc li { display: flex; justify-content: space-between; padding: 0.25em 0; border-bottom: 1px dotted #ddd; }
.book .part { text-align: center; padding-top: 34%; break-before: page; }
.book .part h1 { font-size: 2.4em; font-weight: 800; }`;
}

/** Stylesheet for a theme + render target. */
export function themeCss(theme: BookTheme, target: RenderTarget): string {
  const p = theme.paragraph;
  const { widthIn: pageW, heightIn: pageH } = theme.trim;
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
.book blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid #ddd; color: #444; }
.book ul, .book ol { margin: 0 0 1em 1.5em; }
.book .chapter { break-before: page; }
.book .chapter:first-child { break-before: avoid; }
${chapterStartCss(theme)}
${sceneBreakCss(theme)}
${frontMatterCss(theme)}`;

  const print = `@page { size: ${pageW}in ${pageH}in; margin: ${theme.marginsIn.top}in ${theme.marginsIn.outer}in ${theme.marginsIn.bottom}in ${theme.marginsIn.inner}in; }
.book { width: ${pageW}in; min-height: ${pageH}in; margin: 0 auto; padding: ${theme.marginsIn.top}in ${theme.marginsIn.outer}in ${theme.marginsIn.bottom}in ${theme.marginsIn.inner}in; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.12); box-sizing: border-box; }`;
  const ebook = `.book { max-width: 38rem; margin: 0 auto; padding: 1.5rem; background: #fff; }
.book .chapter, .book .part { break-before: auto; padding-top: 1.5rem; }
.book .epigraph, .book .dedication, .book .title-page, .book .copyright-page { padding-top: 1.5rem; }`;
  return `${base}\n${target === 'print' ? print : ebook}`;
}

/** Render a single body chapter. */
export function renderChapter(theme: BookTheme, chapter: RenderChapter): string {
  const cs = theme.chapterStart;
  const ornament =
    cs.style === 'ornament' && cs.ornament ? `<div class="chapter-ornament">${cs.ornament}</div>` : '';
  const number = cs.style === 'number' ? `<div class="chapter-number">${chapter.index}</div>` : '';
  const subtitle = chapter.subtitle ? `<div class="chapter-subtitle">${esc(chapter.subtitle)}</div>` : '';
  return `<section class="chapter">
  <header class="chapter-heading">${ornament}${number}<h1 class="chapter-title">${esc(chapter.title)}</h1>${subtitle}</header>
  <div class="chapter-body">${tiptapToHtml(chapter.content)}</div>
</section>`;
}

function dataStr(data: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = data?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function renderTitlePage(meta: BookMeta, el: BookElement): string {
  const title = el.title || dataStr(el.data, 'title') || meta.title;
  const subtitle = el.subtitle || dataStr(el.data, 'subtitle');
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

  return `<section class="frontmatter copyright-page auto-fit">
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
  const items = entries
    .map((e) => `<li><span>${esc(e.title)}</span><span>${e.index}</span></li>`)
    .join('');
  return `<section class="frontmatter toc"><h1>Contents</h1><ol>${items}</ol></section>`;
}

function renderProseSection(el: BookElement, cls: string, defaultTitle: string): string {
  const title = el.title || defaultTitle;
  const sectionClass = cls === 'dedication' ? 'frontmatter dedication' : `frontmatter prose-section ${cls}`;
  const heading = cls === 'dedication' ? '' : `<h1>${esc(title)}</h1>`;
  return `<section class="${sectionClass}">${heading}<div class="chapter-body">${tiptapToHtml(el.content)}</div></section>`;
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
    case ChapterKind.PROLOGUE:
    case ChapterKind.INTRODUCTION:
    case ChapterKind.ACKNOWLEDGMENTS:
    case ChapterKind.ABOUT_AUTHOR:
    case ChapterKind.ALSO_BY:
      return renderProseSection(
        el,
        el.kind === ChapterKind.ACKNOWLEDGMENTS || el.kind === ChapterKind.ABOUT_AUTHOR || el.kind === ChapterKind.ALSO_BY
          ? 'backmatter'
          : 'prologue',
        KIND_LABELS[el.kind as keyof typeof KIND_LABELS] ?? 'Section',
      );
    case ChapterKind.CHAPTER:
    default:
      return renderChapter(theme, {
        index: ctx.chapterIndex,
        title: el.title || 'Chapter',
        subtitle: el.subtitle,
        content: el.content,
      });
  }
}

/** Title + copyright front matter (legacy helper retained for callers/tests). */
export function renderFrontMatter(meta: BookMeta, watermark: boolean): string {
  return (
    renderTitlePage(meta, { kind: ChapterKind.TITLE_PAGE }) +
    renderCopyright(meta, { kind: ChapterKind.COPYRIGHT }, watermark)
  );
}

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
}

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

  // Auto TOC entries from PART/CHAPTER elements.
  let chapterNo = 0;
  const toc: TocEntry[] = [];
  for (const el of elements) {
    if (el.kind === ChapterKind.CHAPTER || el.kind === ChapterKind.PART) {
      chapterNo += el.kind === ChapterKind.CHAPTER ? 1 : 0;
      toc.push({ index: el.kind === ChapterKind.CHAPTER ? chapterNo : 0, title: el.title || 'Untitled' });
    }
  }

  let idx = 0;
  const body = elements
    .map((el) => {
      if (el.kind === ChapterKind.CHAPTER) idx += 1;
      return renderElement(theme, el, { meta, watermark, toc, chapterIndex: idx });
    })
    .join('\n');

  const fontsHref = googleFontsHref(theme);
  const fontLink = fontsHref ? `<link rel="stylesheet" href="${fontsHref}">` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
${fontLink}
<style>
html, body { margin: 0; padding: 0; background: ${target === 'print' ? '#e9e9ee' : '#fafafa'}; }
body { padding: ${target === 'print' ? '24px' : '0'}; }
${themeCss(theme, target)}
</style>
</head>
<body>
<div class="book">
${body}
</div>
</body>
</html>`;
}
