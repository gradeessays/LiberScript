import { describe, expect, it } from 'vitest';
import { buildEpub } from '../epub';
import { buildDocx } from '../docx';
import { buildCoverPdf } from '../cover-pdf';
import type { ExportBook, ExportCover } from '../types';

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'A Scene' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' & ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      ],
    },
    { type: 'horizontalRule' },
    { type: 'paragraph', content: [{ type: 'text', text: 'More prose.' }] },
  ],
};

const book: ExportBook = {
  title: 'My <Test> Book',
  author: 'A. Writer',
  publisher: 'Indie Press',
  language: 'en',
  themeKey: 'novel-classic',
  watermark: true,
  elements: [
    { kind: 'TITLE_PAGE', data: {} },
    { kind: 'COPYRIGHT', data: { genre: 'fiction' } },
    { kind: 'TOC' },
    { kind: 'CHAPTER', title: 'Chapter 1', subtitle: 'The Start', content: doc },
    { kind: 'CHAPTER', title: 'Chapter 2', content: doc },
  ],
};

const cover: ExportCover = {
  title: 'My Book',
  author: 'A. Writer',
  trimWidthIn: 6,
  trimHeightIn: 9,
  pageCount: 220,
  paper: 'white',
  binding: 'paperback',
  dominantColor: '#334155',
  textColor: '#ffffff',
  backText: 'A gripping tale that will keep you turning pages all night long.',
  spineText: 'My Book — A. Writer',
};

describe('exporters', () => {
  it('builds a non-empty EPUB (zip)', async () => {
    const bytes = await buildEpub(book);
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });

  it('builds a non-empty DOCX (zip)', async () => {
    const bytes = await buildDocx(book);
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('builds a non-empty cover PDF', async () => {
    const bytes = await buildCoverPdf(cover);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // "%PDF"
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)).toBe('%PDF');
  });

  it('embeds a front image with zoom/pan + clipping', async () => {
    // 1×1 transparent PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    const bytes = await buildCoverPdf({
      ...cover,
      frontImage: new Uint8Array(png),
      frontImageType: 'png',
      frontScale: 1.5,
      frontPosX: 30,
      frontPosY: 70,
    });
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)).toBe('%PDF');
  });
});
