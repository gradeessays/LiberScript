import { tiptapToHtml } from './tiptap-html';
import type { BookMeta, BookTheme, RenderChapter, RenderTarget } from './types';

/** Google Fonts stylesheet href for a theme's body + heading fonts (preview). */
export function googleFontsHref(theme: BookTheme): string | null {
  const families = [theme.bodyFont.google, theme.headingFont.google].filter(Boolean);
  if (families.length === 0) return null;
  const params = families.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function sceneBreakCss(theme: BookTheme): string {
  const sb = theme.sceneBreak;
  if (sb.style === 'blank') {
    return `.book .scene-break { height: 1.6em; }`;
  }
  if (sb.style === 'rule') {
    return `.book .scene-break { margin: 1.2em auto; width: 18%; border-top: 1px solid currentColor; opacity: 0.5; }`;
  }
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

  if (cs.style === 'rule') {
    css += `\n.book .chapter-title { border-bottom: 2px solid currentColor; padding-bottom: 0.3em; display: inline-block; }`;
  }
  if (cs.style === 'ornament') {
    css += `\n.book .chapter-ornament { font-size: 1.6em; opacity: 0.7; margin-bottom: 0.4em; }`;
  }
  if (cs.style === 'number') {
    css += `\n.book .chapter-number { font-size: 2.6em; font-weight: 800; line-height: 1; color: #999; margin-bottom: 0.1em; }`;
  }
  if (cs.dropCap) {
    css += `\n.book .chapter-body > p:first-of-type::first-letter { float: left; font-family: ${theme.headingFont.stack}; font-size: 3.4em; line-height: 0.78; padding: 0.02em 0.08em 0 0; font-weight: 700; }`;
  }
  if (cs.smallCapsFirstLine) {
    css += `\n.book .chapter-body > p:first-of-type::first-line { font-variant: small-caps; letter-spacing: 0.02em; }`;
  }
  return css;
}

/** Stylesheet for a theme + render target. */
export function themeCss(theme: BookTheme, target: RenderTarget): string {
  const p = theme.paragraph;
  const pageW = theme.trim.widthIn;
  const pageH = theme.trim.heightIn;

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
.book .frontmatter { break-after: page; text-align: center; }
.book .title-page { padding-top: 28%; }
.book .title-page .book-title { font-family: ${theme.headingFont.stack}; font-size: 2.4em; font-weight: 800; }
.book .title-page .book-author { margin-top: 1em; font-size: 1.2em; }
.book .title-page .book-publisher { margin-top: 3em; font-size: 0.95em; color: #555; }
.book .title-page .publisher-logo { max-height: 60px; margin: 0 auto 0.6em; display: block; }
.book .copyright-page { text-align: left; font-size: 0.82em; color: #333; padding-top: 40%; }
.book .watermark { margin-top: 1.4em; color: #888; font-style: italic; }
${chapterStartCss(theme)}
${sceneBreakCss(theme)}`;

  // Print: real page geometry for paged.js + a page-like preview surface.
  const print = `@page { size: ${pageW}in ${pageH}in; margin: ${theme.marginsIn.top}in ${theme.marginsIn.outer}in ${theme.marginsIn.bottom}in ${theme.marginsIn.inner}in; }
.book { width: ${pageW}in; min-height: ${pageH}in; margin: 0 auto; padding: ${theme.marginsIn.top}in ${theme.marginsIn.outer}in ${theme.marginsIn.bottom}in ${theme.marginsIn.inner}in; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.12); box-sizing: border-box; }`;

  const ebook = `.book { max-width: 38rem; margin: 0 auto; padding: 1.5rem; background: #fff; }
.book .chapter { break-before: auto; padding-top: 1.5rem; }`;

  return `${base}\n${target === 'print' ? print : ebook}`;
}

/** Render a single chapter to HTML. */
export function renderChapter(theme: BookTheme, chapter: RenderChapter): string {
  const cs = theme.chapterStart;
  const ornament =
    cs.style === 'ornament' && cs.ornament
      ? `<div class="chapter-ornament">${cs.ornament}</div>`
      : '';
  const number = cs.style === 'number' ? `<div class="chapter-number">${chapter.index}</div>` : '';
  const subtitle = chapter.subtitle
    ? `<div class="chapter-subtitle">${escapeAttr(chapter.subtitle)}</div>`
    : '';
  return `<section class="chapter">
  <header class="chapter-heading">${ornament}${number}<h1 class="chapter-title">${escapeAttr(chapter.title)}</h1>${subtitle}</header>
  <div class="chapter-body">${tiptapToHtml(chapter.content)}</div>
</section>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Title + copyright front matter (with publisher name/logo and watermark). */
export function renderFrontMatter(meta: BookMeta, watermark: boolean): string {
  const logo = meta.logoUrl
    ? `<img class="publisher-logo" src="${escapeAttr(meta.logoUrl)}" alt="${escapeAttr(meta.publisherName ?? 'Publisher')}" />`
    : '';
  const publisher = meta.publisherName
    ? `<div class="book-publisher">${logo}${escapeAttr(meta.publisherName)}</div>`
    : '';
  const year = meta.year ?? new Date().getFullYear();
  const rights = meta.rights ?? 'All rights reserved.';
  const isbn = meta.isbn ? `<p>ISBN: ${escapeAttr(meta.isbn)}</p>` : '';
  const mark = watermark
    ? `<p class="watermark">Made with Liberscript — liberscript.app</p>`
    : '';

  return `<section class="frontmatter title-page">
  <div class="book-title">${escapeAttr(meta.title)}</div>
  ${meta.author ? `<div class="book-author">${escapeAttr(meta.author)}</div>` : ''}
  ${publisher}
</section>
<section class="frontmatter copyright-page">
  <p>${escapeAttr(meta.title)}</p>
  ${meta.author ? `<p>Copyright © ${year} ${escapeAttr(meta.author)}</p>` : `<p>Copyright © ${year}</p>`}
  <p>${escapeAttr(rights)}</p>
  ${meta.publisherName ? `<p>Published by ${escapeAttr(meta.publisherName)}</p>` : ''}
  ${isbn}
  ${mark}
</section>`;
}

export interface RenderBookInput {
  theme: BookTheme;
  target: RenderTarget;
  watermark: boolean;
  meta: BookMeta;
  chapters: RenderChapter[];
  includeFrontMatter?: boolean;
}

/** Full standalone HTML document used by the live preview and the exporters. */
export function renderBookDocument(input: RenderBookInput): string {
  const { theme, target, watermark, meta, chapters, includeFrontMatter = true } = input;
  const fontsHref = googleFontsHref(theme);
  const fontLink = fontsHref ? `<link rel="stylesheet" href="${fontsHref}">` : '';
  const front = includeFrontMatter ? renderFrontMatter(meta, watermark) : '';
  const body = chapters.map((c) => renderChapter(theme, c)).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttr(meta.title)}</title>
${fontLink}
<style>
html, body { margin: 0; padding: 0; background: ${target === 'print' ? '#e9e9ee' : '#fafafa'}; }
body { padding: ${target === 'print' ? '24px' : '0'}; }
${themeCss(theme, target)}
</style>
</head>
<body>
<div class="book">
${front}
${body}
</div>
</body>
</html>`;
}
