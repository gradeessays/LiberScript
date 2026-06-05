/**
 * Minimal ProseMirror/TipTap document types shared by the parser, the editor,
 * and the API. The editor owns the precise schema; this is the lowest common
 * shape needed for serialization, word counts, and merging.
 */
export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

/** Extract plain text from a TipTap node/doc (for word counts / previews). */
export function tiptapText(node: TiptapNode | TiptapDoc): string {
  if ('text' in node && typeof node.text === 'string') return node.text;
  const children = (node as TiptapNode).content ?? [];
  return children.map(tiptapText).join(' ');
}
