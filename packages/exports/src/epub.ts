import JSZip from 'jszip';
import { tiptapToHtml, applyTypography, getTheme, type BookTheme } from '@liberscript/format';
import { ChapterKind, KIND_LABELS, generateCopyright, type BookGenre } from '@liberscript/core';
import type { ExportBook, ExportElement } from './types';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function xhtmlSafe(html: string): string {
  return html.replace(/<br>/g, '<br/>');
}

function dataStr(el: ExportElement, key: string): string | undefined {
  const v = el.data?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

interface Page {
  id: string;
  fileName: string;
  title: string;
  /** Include in the reading-order ToC. */
  inToc: boolean;
  body: string;
}

/**
 * EPUB stylesheet derived from the chosen theme + typography. EPUBs reflow, so we
 * carry the *design* (fonts, indents, paragraph rhythm, justification) rather than
 * a fixed page size — the reader controls the page.
 */
function epubStyle(theme: BookTheme): string {
  const p = theme.paragraph;
  return `
body { font-family: ${theme.bodyFont.stack}; line-height: ${theme.lineHeight}; margin: 1em 1.2em; ${
    p.justify ? 'text-align: justify; hyphens: auto;' : ''
  } }
h1, h2, h3 { font-family: ${theme.headingFont.stack}; }
h1 { font-size: 1.5em; margin: 1em 0 0.6em; text-align: center; }
h2 { font-size: 1.2em; } h3 { font-size: 1.05em; }
p { margin: 0 0 ${p.spacingEm}em; text-indent: ${p.indentEm}em; }
.first p:first-of-type, .nonindent p { text-indent: 0; }
.subtitle { text-align: center; font-style: italic; color: #444; margin-bottom: 1.2em; }
.titlepage, .epigraph, .dedication { text-align: center; }
.titlepage .title { font-family: ${theme.headingFont.stack}; font-size: 2em; font-weight: bold; margin-top: 2em; }
.titlepage .author { margin-top: 1.5em; }
.titlepage .publisher { margin-top: 3em; color: #555; }
.copyright { font-size: 0.85em; }
.copyright.cp-center { text-align: center; }
.copyright.cp-left { text-align: left; }
.copyright p { text-indent: 0; margin: 0 0 0.8em; }
.attribution { font-variant: small-caps; color: #555; margin-top: 0.4em; }
.opening-quote { text-align: center; font-style: italic; color: #444; margin: 0 0 1.4em; }
.scene-break { text-align: center; margin: 1em 0; }
.scene-break::after { content: "* * *"; }
blockquote { margin: 0 0 1em 1em; font-style: italic; }
`;
}

function elementToPage(el: ExportElement, index: number, book: ExportBook): Page | null {
  const idx = String(index).padStart(4, '0');
  const fileName = `text/sec${idx}.xhtml`;
  const id = `sec${idx}`;
  const label = (k: string) => KIND_LABELS[k as keyof typeof KIND_LABELS] ?? 'Section';
  const title = el.title || label(el.kind);
  const body = xhtmlSafe(tiptapToHtml(el.content));
  const subtitle = el.subtitle ? `<p class="subtitle">${esc(el.subtitle)}</p>` : '';

  switch (el.kind) {
    case ChapterKind.TOC:
      return null; // The EPUB nav is the table of contents.
    case ChapterKind.TITLE_PAGE: {
      const author = dataStr(el, 'author') || book.author;
      const publisher = dataStr(el, 'publisher') || book.publisher;
      return {
        id,
        fileName,
        title: 'Title Page',
        inToc: false,
        body: `<section class="titlepage"><div class="title">${esc(dataStr(el, 'title') || book.title)}</div>${
          dataStr(el, 'subtitle') ? `<div class="subtitle">${esc(dataStr(el, 'subtitle')!)}</div>` : ''
        }${author ? `<div class="author">${esc(author)}</div>` : ''}${
          publisher ? `<div class="publisher">${esc(publisher)}</div>` : ''
        }</section>`,
      };
    }
    case ChapterKind.COPYRIGHT: {
      const custom = dataStr(el, 'customText');
      let inner: string;
      if (custom) {
        inner = custom.split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join('');
      } else {
        const cr = generateCopyright({
          title: book.title,
          author: dataStr(el, 'author') || book.author,
          year: Number(el.data?.year) || undefined,
          genre: (dataStr(el, 'genre') as BookGenre) || undefined,
        });
        inner = `<p>${esc(book.title)}</p><p>${esc(cr.copyrightLine)}</p><p>${esc(cr.rightsLine)}</p>${
          cr.disclaimer ? `<p>${esc(cr.disclaimer)}</p>` : ''
        }`;
      }
      const publisher = dataStr(el, 'publisher') || book.publisher;
      const isbn = dataStr(el, 'isbn') || book.isbn;
      const mark = book.watermark ? `<p><em>Made with Liberscript</em></p>` : '';
      const align = dataStr(el, 'align') === 'left' ? 'cp-left' : 'cp-center';
      return {
        id,
        fileName,
        title: 'Copyright',
        inToc: false,
        body: `<section class="copyright ${align}">${inner}${publisher ? `<p>Published by ${esc(publisher)}</p>` : ''}${
          isbn ? `<p>ISBN: ${esc(isbn)}</p>` : ''
        }${mark}</section>`,
      };
    }
    case ChapterKind.EPIGRAPH: {
      const attribution = dataStr(el, 'attribution');
      return {
        id,
        fileName,
        title: 'Epigraph',
        inToc: false,
        body: `<section class="epigraph">${body}${attribution ? `<p class="attribution">— ${esc(attribution)}</p>` : ''}</section>`,
      };
    }
    case ChapterKind.DEDICATION:
      return { id, fileName, title: 'Dedication', inToc: false, body: `<section class="dedication">${body}</section>` };
    default: {
      const oq = dataStr(el, 'openingQuote');
      const oqAttr = dataStr(el, 'openingQuoteAttribution');
      const quote = oq
        ? `<div class="opening-quote">${esc(oq)}${oqAttr ? `<p class="attribution">— ${esc(oqAttr)}</p>` : ''}</div>`
        : '';
      return {
        id,
        fileName,
        title,
        inToc: el.kind !== ChapterKind.TITLE_PAGE,
        body: `<section class="first"><h1>${esc(title)}</h1>${subtitle}${quote}${body}</section>`,
      };
    }
  }
}

function wrapXhtml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="../style.css"/></head>
<body>${body}</body>
</html>`;
}

/** Build a reflowable EPUB3 file (returns the zip bytes). */
export async function buildEpub(book: ExportBook): Promise<Uint8Array> {
  const uuid = globalThis.crypto.randomUUID();
  const pages = book.elements
    .map((el, i) => elementToPage(el, i + 1, book))
    .filter((p): p is Page => p !== null);

  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  );
  zip.file('OEBPS/style.css', epubStyle(applyTypography(getTheme(book.themeKey), book.typography)));
  for (const p of pages) zip.file(`OEBPS/${p.fileName}`, wrapXhtml(p.title, p.body));

  const manifest = pages
    .map((p) => `<item id="${p.id}" href="${p.fileName}" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const spine = pages.map((p) => `<itemref idref="${p.id}"/>`).join('\n');
  const navItems = pages
    .filter((p) => p.inToc)
    .map((p) => `<li><a href="${p.fileName}">${esc(p.title)}</a></li>`)
    .join('\n');

  zip.file(
    'OEBPS/nav.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><meta charset="utf-8"/><title>Contents</title></head>
<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${navItems}</ol></nav></body>
</html>`,
  );

  zip.file(
    'OEBPS/package.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
<dc:title>${esc(book.title)}</dc:title>
<dc:language>${esc(book.language || 'en')}</dc:language>
${book.author ? `<dc:creator>${esc(book.author)}</dc:creator>` : ''}
${book.publisher ? `<dc:publisher>${esc(book.publisher)}</dc:publisher>` : ''}
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${manifest}
</manifest>
<spine>${spine}</spine>
</package>`,
  );

  return zip.generateAsync({ type: 'uint8array', mimeType: 'application/epub+zip' });
}
