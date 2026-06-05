import type { TiptapDoc, TiptapNode } from '@liberscript/core';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

function renderText(node: TiptapNode): string {
  let html = escapeHtml(node.text ?? '');
  const marks = (node as { marks?: Mark[] }).marks ?? [];
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        html = `<strong>${html}</strong>`;
        break;
      case 'italic':
        html = `<em>${html}</em>`;
        break;
      case 'strike':
        html = `<s>${html}</s>`;
        break;
      case 'code':
        html = `<code>${html}</code>`;
        break;
      case 'link': {
        const href = escapeHtml(String(mark.attrs?.href ?? '#'));
        html = `<a href="${href}">${html}</a>`;
        break;
      }
      default:
        break;
    }
  }
  return html;
}

function renderChildren(node: TiptapNode): string {
  return (node.content ?? []).map(renderNode).join('');
}

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case 'text':
      return renderText(node);
    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`;
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
      return `<h${level}>${renderChildren(node)}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${renderChildren(node)}</ul>`;
    case 'orderedList':
      return `<ol>${renderChildren(node)}</ol>`;
    case 'listItem':
      return `<li>${renderChildren(node)}</li>`;
    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    case 'codeBlock':
      return `<pre><code>${renderChildren(node)}</code></pre>`;
    case 'hardBreak':
      return '<br>';
    case 'horizontalRule':
      // A horizontal rule authored in the editor is a scene break.
      return '<div class="scene-break" aria-hidden="true"></div>';
    default:
      return renderChildren(node);
  }
}

/** Render a TipTap/ProseMirror document to body HTML. */
export function tiptapToHtml(doc: unknown): string {
  const d = doc as TiptapDoc | undefined;
  if (!d || !Array.isArray(d.content)) return '';
  return d.content.map(renderNode).join('\n');
}
