import type { TiptapDoc, TiptapNode } from '@liberscript/core';
import type { ContentBlock } from './types';

function paragraph(text: string): TiptapNode {
  return text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' };
}

/** Convert content blocks into a TipTap doc (sub-headings preserved). */
export function blocksToTiptap(blocks: ContentBlock[]): TiptapDoc {
  const content: TiptapNode[] = blocks.map((b) =>
    b.kind === 'heading'
      ? {
          type: 'heading',
          // Sub-headings render at level 2+ (the chapter title is separate).
          attrs: { level: Math.min(Math.max(b.level, 2), 4) },
          content: [{ type: 'text', text: b.text }],
        }
      : paragraph(b.text),
  );
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

/** Convert plain text into a TipTap doc: blank-line-separated paragraphs. */
export function textToTiptap(text: string): TiptapDoc {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: 'doc',
    content: paragraphs.length ? paragraphs.map(paragraph) : [{ type: 'paragraph' }],
  };
}
