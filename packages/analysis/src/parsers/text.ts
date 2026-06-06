import { textToBlocks } from '../blocks';
import { isSectionHeading } from '../chapters';
import type { ContentBlock } from '../types';

/** Parse plain text into blocks; section-keyword lines become headings. */
export function parseTxt(buffer: Buffer): ContentBlock[] {
  return textToBlocks(buffer.toString('utf8'), isSectionHeading);
}

/** Parse Markdown into blocks; ATX headings become heading blocks. */
export function parseMarkdown(buffer: Buffer): ContentBlock[] {
  const raw = buffer.toString('utf8').replace(/\r\n/g, '\n');
  const blocks: ContentBlock[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push({ kind: 'para', text: stripInlineMarkdown(para.join(' ')).trim() });
      para = [];
    }
  };

  for (const line of raw.split('\n')) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({
        kind: 'heading',
        level: heading[1]!.length,
        text: stripInlineMarkdown(heading[2] ?? '').trim(),
      });
    } else if (line.trim()) {
      para.push(line.trim());
    } else {
      flush();
    }
  }
  flush();
  return blocks.filter((b) => b.text.length > 0);
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
