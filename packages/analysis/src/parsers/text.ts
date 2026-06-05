import { textToBlocks } from '../blocks';
import { assembleChapters, isChapterHeading } from '../chapters';
import type { ContentBlock, ParsedChapter } from '../types';

/** Parse plain text: lines beginning with a chapter keyword start chapters. */
export function parseTxt(buffer: Buffer): ParsedChapter[] {
  return assembleChapters(textToBlocks(buffer.toString('utf8'), isChapterHeading));
}

/** Parse Markdown: ATX headings become blocks; chapter keywords start chapters. */
export function parseMarkdown(buffer: Buffer): ParsedChapter[] {
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

  return assembleChapters(blocks.filter((b) => b.text.length > 0));
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
