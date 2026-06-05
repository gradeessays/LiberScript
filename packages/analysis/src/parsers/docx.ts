import mammoth from 'mammoth';
import { htmlToBlocks } from '../blocks';
import { assembleChapters } from '../chapters';
import type { ParsedChapter } from '../types';

/** Parse a .docx buffer into chapters, anchoring on Word heading structure. */
export async function parseDocx(buffer: Buffer): Promise<ParsedChapter[]> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return assembleChapters(htmlToBlocks(html));
}
