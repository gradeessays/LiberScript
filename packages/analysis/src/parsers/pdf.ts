import pdfParse from 'pdf-parse';
import { textToBlocks } from '../blocks';
import { isSectionHeading } from '../chapters';
import type { ContentBlock } from '../types';

/** Extract text from a PDF into blocks; section-keyword lines become headings. */
export async function parsePdf(buffer: Buffer): Promise<ContentBlock[]> {
  const data = await pdfParse(buffer);
  return textToBlocks(data.text, isSectionHeading);
}
