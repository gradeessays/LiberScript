import { SourceFormat, detectFormat, type TiptapDoc } from '@liberscript/core';
import { computeStats } from './stats';
import { assembleSections } from './chapters';
import { blocksToTiptap } from './tiptap';
import { parseDocx } from './parsers/docx';
import { parseEpub } from './parsers/epub';
import { parsePdf } from './parsers/pdf';
import { parseMarkdown, parseTxt } from './parsers/text';
import type { ContentBlock, ParsedChapter, ParsedManuscript } from './types';

async function parseBlocks(format: SourceFormat, buffer: Buffer): Promise<ContentBlock[]> {
  switch (format) {
    case SourceFormat.DOCX:
      return parseDocx(buffer);
    case SourceFormat.EPUB:
      return parseEpub(buffer);
    case SourceFormat.PDF:
      return parsePdf(buffer);
    case SourceFormat.MARKDOWN:
      return parseMarkdown(buffer);
    case SourceFormat.TXT:
      return parseTxt(buffer);
    default:
      throw new Error(`Unsupported source format: ${format}`);
  }
}

/**
 * Parse a manuscript into typed sections (title page, copyright, dedication,
 * chapters, epilogue, …), auto-detecting the book title/author + stats.
 */
export async function parseManuscript(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedManuscript> {
  const format = detectFormat(fileName);
  if (!format) throw new Error(`Unsupported file type: ${fileName}`);
  const blocks = await parseBlocks(format, buffer);
  const { chapters, title, author } = assembleSections(blocks);
  return { sourceFormat: format, title, author, chapters, stats: computeStats(chapters) };
}

/** Convert a parsed section's body blocks into an editable TipTap document. */
export function chapterToDoc(chapter: ParsedChapter): TiptapDoc {
  return blocksToTiptap(chapter.blocks);
}
