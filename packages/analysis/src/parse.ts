import { SourceFormat, detectFormat, type TiptapDoc } from '@liberscript/core';
import { computeStats } from './stats';
import { blocksToTiptap } from './tiptap';
import { parseDocx } from './parsers/docx';
import { parseEpub } from './parsers/epub';
import { parsePdf } from './parsers/pdf';
import { parseMarkdown, parseTxt } from './parsers/text';
import type { ParsedChapter, ParsedManuscript } from './types';

async function parseChapters(format: SourceFormat, buffer: Buffer): Promise<ParsedChapter[]> {
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

/** Parse a manuscript file into normalized chapters + stats. */
export async function parseManuscript(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedManuscript> {
  const format = detectFormat(fileName);
  if (!format) {
    throw new Error(`Unsupported file type: ${fileName}`);
  }
  const chapters = await parseChapters(format, buffer);
  return { sourceFormat: format, chapters, stats: computeStats(chapters) };
}

/** Convert a parsed chapter's body blocks into an editable TipTap document. */
export function chapterToDoc(chapter: ParsedChapter): TiptapDoc {
  return blocksToTiptap(chapter.blocks);
}
