import pdfParse from 'pdf-parse';
import { textToBlocks } from '../blocks';
import { assembleChapters, isChapterHeading } from '../chapters';
import type { ParsedChapter } from '../types';

/** Extract text from a PDF and assemble chapters by chapter-heading lines. */
export async function parsePdf(buffer: Buffer): Promise<ParsedChapter[]> {
  const data = await pdfParse(buffer);
  return assembleChapters(textToBlocks(data.text, isChapterHeading));
}
