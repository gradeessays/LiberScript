const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/** Strip HTML/XHTML tags to plain text, preserving paragraph breaks. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|blockquote)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split an HTML document into sections at each heading (h1–h3). Text before the
 * first heading becomes an untitled lead section.
 */
export function splitHtmlByHeadings(html: string): { title: string; text: string }[] {
  const sections: { title: string; text: string }[] = [];
  const headingRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;

  let lastIndex = 0;
  let pendingTitle = '';
  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(html)) !== null) {
    const body = html.slice(lastIndex, match.index);
    const text = htmlToText(body);
    if (text) sections.push({ title: pendingTitle, text });
    pendingTitle = htmlToText(match[1] ?? '');
    lastIndex = headingRe.lastIndex;
  }

  const tail = htmlToText(html.slice(lastIndex));
  if (tail || pendingTitle) sections.push({ title: pendingTitle, text: tail });

  return sections.filter((s) => s.text.length > 0 || s.title.length > 0);
}
