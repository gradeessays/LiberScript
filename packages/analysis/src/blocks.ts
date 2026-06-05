import { htmlToText } from './html';
import type { ContentBlock } from './types';

/** Extract ordered heading/paragraph blocks from an HTML/XHTML document. */
export function htmlToBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const re = /<(h[1-6]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = (match[1] ?? '').toLowerCase();
    const text = htmlToText(match[2] ?? '');
    if (!text) continue;
    if (tag.startsWith('h')) {
      blocks.push({ kind: 'heading', level: Number(tag[1]), text });
    } else {
      blocks.push({ kind: 'para', text });
    }
  }
  return blocks;
}

/**
 * Turn plain text into blocks. Lines that look like chapter markers become
 * level-1 headings; everything else groups into blank-line-separated paragraphs.
 */
export function textToBlocks(text: string, isHeading: (line: string) => boolean): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push({ kind: 'para', text: para.join(' ').trim() });
      para = [];
    }
  };

  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flush();
    } else if (isHeading(line)) {
      flush();
      blocks.push({ kind: 'heading', level: 1, text: line });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}
