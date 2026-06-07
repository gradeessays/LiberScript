import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from 'docx';
import { ChapterKind, KIND_LABELS, generateCopyright, type BookGenre } from '@liberscript/core';
import type { TiptapNode } from '@liberscript/core';
import { applyTypography, getTheme } from '@liberscript/format';
import type { ExportBook, ExportElement } from './types';

const HEADING = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
];

interface Mark {
  type: string;
}

function runs(node: TiptapNode): TextRun[] {
  const out: TextRun[] = [];
  for (const child of node.content ?? []) {
    if (child.type === 'text') {
      const marks = (child as { marks?: Mark[] }).marks ?? [];
      out.push(
        new TextRun({
          text: child.text ?? '',
          bold: marks.some((m) => m.type === 'bold'),
          italics: marks.some((m) => m.type === 'italic'),
          strike: marks.some((m) => m.type === 'strike'),
        }),
      );
    } else if (child.type === 'hardBreak') {
      out.push(new TextRun({ text: '', break: 1 }));
    } else {
      out.push(...runs(child));
    }
  }
  return out;
}

function nodeToParagraphs(node: TiptapNode): Paragraph[] {
  switch (node.type) {
    case 'paragraph':
      return [new Paragraph({ children: runs(node) })];
    case 'heading':
      return [
        new Paragraph({
          heading: HEADING[Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 4) - 1],
          children: runs(node),
        }),
      ];
    case 'blockquote':
      return (node.content ?? []).map(
        (p) => new Paragraph({ children: runs(p), indent: { left: 480 }, style: 'IntenseQuote' }),
      );
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? []).flatMap((li, i) =>
        (li.content ?? []).map(
          (p) =>
            new Paragraph({
              children: [
                new TextRun({ text: node.type === 'bulletList' ? '•  ' : `${i + 1}.  ` }),
                ...runs(p),
              ],
              indent: { left: 360 },
            }),
        ),
      );
    case 'horizontalRule':
      return [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('* * *')] })];
    default:
      return (node.content ?? []).flatMap(nodeToParagraphs);
  }
}

function contentParagraphs(content: unknown): Paragraph[] {
  const doc = content as TiptapNode | undefined;
  if (!doc || !Array.isArray(doc.content)) return [];
  return doc.content.flatMap(nodeToParagraphs);
}

function dataStr(el: ExportElement, key: string): string | undefined {
  const v = el.data?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function elementParagraphs(el: ExportElement, book: ExportBook): Paragraph[] {
  const label = KIND_LABELS[el.kind as keyof typeof KIND_LABELS] ?? 'Section';
  const heading = (text: string) =>
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)], pageBreakBefore: true });

  switch (el.kind) {
    case ChapterKind.TOC:
      return [];
    case ChapterKind.TITLE_PAGE: {
      const author = dataStr(el, 'author') || book.author;
      const publisher = dataStr(el, 'publisher') || book.publisher;
      return [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400 }, children: [new TextRun({ text: dataStr(el, 'title') || book.title, bold: true, size: 48 })] }),
        ...(author ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: author, size: 28 })] })] : []),
        ...(publisher ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [new TextRun({ text: publisher })] })] : []),
      ];
    }
    case ChapterKind.COPYRIGHT: {
      const custom = dataStr(el, 'customText');
      const lines: string[] = [];
      if (custom) {
        lines.push(...custom.split(/\n{2,}/).map((p) => p.trim()));
      } else {
        const cr = generateCopyright({
          title: book.title,
          author: dataStr(el, 'author') || book.author,
          year: Number(el.data?.year) || undefined,
          genre: (dataStr(el, 'genre') as BookGenre) || undefined,
        });
        lines.push(book.title, cr.copyrightLine, cr.rightsLine);
        if (cr.disclaimer) lines.push(cr.disclaimer);
      }
      const publisher = dataStr(el, 'publisher') || book.publisher;
      const isbn = dataStr(el, 'isbn') || book.isbn;
      if (publisher) lines.push(`Published by ${publisher}`);
      if (isbn) lines.push(`ISBN: ${isbn}`);
      if (book.watermark) lines.push('Made with Liberscript');
      return [
        new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }),
        ...lines.map((l) => new Paragraph({ children: [new TextRun({ text: l, size: 18 })] })),
      ];
    }
    default: {
      const title = el.title || label;
      const subtitle = el.subtitle
        ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: el.subtitle, italics: true })] })]
        : [];
      const oq = dataStr(el, 'openingQuote');
      const oqAttr = dataStr(el, 'openingQuoteAttribution');
      const quote = oq
        ? [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new TextRun({ text: oq, italics: true })] }),
            ...(oqAttr
              ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `— ${oqAttr}`, italics: true, size: 18 })] })]
              : []),
          ]
        : [];
      return [heading(title), ...subtitle, ...quote, ...contentParagraphs(el.content)];
    }
  }
}

/** Build a .docx file (returns the bytes), formatted to the chosen size & design. */
export async function buildDocx(book: ExportBook): Promise<Uint8Array> {
  const theme = applyTypography(getTheme(book.themeKey), book.typography);
  const children = book.elements.flatMap((el) => elementParagraphs(el, book));
  const t = book.typography;
  const pageNumbers = t?.pageNumbers !== false;
  const runningHeaders = t?.runningHeaders !== false;

  const footers = pageNumbers
    ? {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })],
            }),
          ],
        }),
        first: new Footer({ children: [new Paragraph('')] }),
      }
    : undefined;
  const headers = runningHeaders
    ? {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: book.title, italics: true, size: 18 })],
            }),
          ],
        }),
        first: new Header({ children: [new Paragraph('')] }),
      }
    : undefined;

  const doc = new Document({
    creator: book.author ?? 'Liberscript',
    title: book.title,
    styles: {
      default: {
        document: {
          run: { font: theme.bodyFont.name, size: Math.round(theme.baseFontPt * 2) },
          paragraph: { spacing: { line: Math.round(theme.lineHeight * 240) } },
        },
      },
      paragraphStyles: [1, 2, 3, 4].map((lvl) => ({
        id: `Heading${lvl}`,
        name: `Heading ${lvl}`,
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { font: theme.headingFont.name, bold: true, size: Math.round(theme.baseFontPt * 2 * (1.6 - lvl * 0.18)) },
        paragraph: { spacing: { before: 240, after: 120 } },
      })),
    },
    sections: [
      {
        properties: {
          titlePage: true, // suppress the header/footer on the opening page
          page: {
            size: {
              width: convertInchesToTwip(theme.trim.widthIn),
              height: convertInchesToTwip(theme.trim.heightIn),
            },
            margin: {
              top: convertInchesToTwip(theme.marginsIn.top),
              bottom: convertInchesToTwip(theme.marginsIn.bottom),
              left: convertInchesToTwip(theme.marginsIn.inner),
              right: convertInchesToTwip(theme.marginsIn.outer),
            },
          },
        },
        ...(headers ? { headers } : {}),
        ...(footers ? { footers } : {}),
        children: children.length ? children : [new Paragraph('')],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
