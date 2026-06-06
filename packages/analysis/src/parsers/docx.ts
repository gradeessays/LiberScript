import mammoth from 'mammoth';
import { htmlToBlocks } from '../blocks';
import type { ContentBlock } from '../types';

/** Parse a .docx buffer into ordered content blocks (headings + paragraphs). */
export async function parseDocx(buffer: Buffer): Promise<ContentBlock[]> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return htmlToBlocks(html);
}
