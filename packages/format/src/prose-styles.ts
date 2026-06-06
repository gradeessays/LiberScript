import type { BookTheme } from './types';

export interface ProseStyle {
  key: string;
  name: string;
}

/**
 * Opening-quote (chapter epigraph) presentations. Each renders the shared
 * `.chapter-opening-quote` markup (quote text + a `.attr` attribution line); only
 * one is active per book, so we emit that one style's rules directly.
 */
export const OPENING_QUOTE_STYLES: ProseStyle[] = [
  { key: 'centered', name: 'Centered italic' },
  { key: 'left-rule', name: 'Left rule · left aligned' },
  { key: 'hairlines', name: 'Hairline boundaries' },
  { key: 'double-rule', name: 'Double-rule boundaries' },
  { key: 'box', name: 'Boxed (wrapped)' },
  { key: 'shaded', name: 'Shaded panel' },
  { key: 'pull', name: 'Large pull quote' },
  { key: 'marks', name: 'Big quotation mark' },
  { key: 'wrap-quotes', name: 'Wrapped in “ ” marks' },
  { key: 'indented', name: 'Indented both sides' },
  { key: 'right-attr', name: 'Centered · right attribution' },
  { key: 'smallcaps', name: 'Small-caps quote' },
  { key: 'plain-left', name: 'Plain · left aligned' },
];

/** CSS for the chosen opening-quote style (defaults to centered italic). */
export function openingQuoteCss(key: string | null | undefined, theme: BookTheme): string {
  const hf = theme.headingFont.stack;
  const base = `.book .chapter-opening-quote{margin:0 0 1.8em;color:#444;}
.book .chapter-opening-quote .attr{display:block;font-style:normal;font-variant:small-caps;color:#666;margin-top:0.5em;font-size:0.9em;letter-spacing:0.03em;}`;
  const v: Record<string, string> = {
    centered: `.book .chapter-opening-quote{text-align:center;font-style:italic;}`,
    'left-rule': `.book .chapter-opening-quote{text-align:left;font-style:italic;border-left:3px solid currentColor;padding-left:1em;opacity:0.95;}
.book .chapter-opening-quote .attr{text-align:left;}`,
    hairlines: `.book .chapter-opening-quote{text-align:center;font-style:italic;border-top:1px solid currentColor;border-bottom:1px solid currentColor;padding:0.9em 0;}`,
    'double-rule': `.book .chapter-opening-quote{text-align:center;font-style:italic;border-top:3px double currentColor;border-bottom:3px double currentColor;padding:0.9em 0;}`,
    box: `.book .chapter-opening-quote{text-align:center;font-style:italic;border:1px solid currentColor;padding:1em 1.2em;}`,
    shaded: `.book .chapter-opening-quote{text-align:center;font-style:italic;background:rgba(0,0,0,0.05);padding:1em 1.2em;}`,
    pull: `.book .chapter-opening-quote{text-align:center;font-style:italic;font-family:${hf};font-size:1.3em;line-height:1.4;}`,
    marks: `.book .chapter-opening-quote{text-align:left;font-style:italic;position:relative;padding-left:1.6em;}
.book .chapter-opening-quote::before{content:"\\201C";font-family:${hf};font-size:3em;line-height:0.8;position:absolute;left:0;top:0;opacity:0.3;}`,
    'wrap-quotes': `.book .chapter-opening-quote{text-align:center;font-style:italic;}
.book .chapter-opening-quote::before{content:"\\201C";}
.book .chapter-opening-quote .attr{} `,
    indented: `.book .chapter-opening-quote{margin:0 2.2em 1.8em;text-align:justify;font-style:italic;}
.book .chapter-opening-quote .attr{text-align:right;}`,
    'right-attr': `.book .chapter-opening-quote{text-align:center;font-style:italic;}
.book .chapter-opening-quote .attr{text-align:right;}`,
    smallcaps: `.book .chapter-opening-quote{text-align:center;font-variant:small-caps;letter-spacing:0.04em;}`,
    'plain-left': `.book .chapter-opening-quote{text-align:left;font-style:italic;}
.book .chapter-opening-quote .attr{text-align:left;}`,
  };
  const chosen = v[key ?? 'centered'] ?? v.centered;
  // `wrap-quotes` needs a closing mark appended after the quote text; the text is a
  // single node, so we approximate with surrounding marks via ::before/::after.
  const wrapAfter =
    (key ?? '') === 'wrap-quotes'
      ? `.book .chapter-opening-quote{quotes:"\\201C" "\\201D";}`
      : '';
  return `${base}\n${chosen}\n${wrapAfter}`;
}

/** Block-quote presentations for body content (one active per book). */
export const BLOCKQUOTE_STYLES: ProseStyle[] = [
  { key: 'left-rule', name: 'Left rule (classic)' },
  { key: 'thick-bar', name: 'Thick accent bar' },
  { key: 'box', name: 'Boxed' },
  { key: 'shaded', name: 'Shaded background' },
  { key: 'centered', name: 'Centered italic' },
  { key: 'quote-mark', name: 'Hanging quote mark' },
  { key: 'both-indent', name: 'Indented both sides' },
  { key: 'double-rule', name: 'Top & bottom rules' },
];

/** CSS for the chosen block-quote style (defaults to the classic left rule). */
export function blockQuoteCss(key: string | null | undefined, theme: BookTheme): string {
  const hf = theme.headingFont.stack;
  const v: Record<string, string> = {
    'left-rule': `.book blockquote{margin:0 0 1em;padding-left:1em;border-left:3px solid #ccc;color:#444;}`,
    'thick-bar': `.book blockquote{margin:0 0 1em;padding:0.2em 0 0.2em 1.1em;border-left:6px solid currentColor;color:#333;}`,
    box: `.book blockquote{margin:0 0 1.1em;padding:0.8em 1em;border:1px solid #ccc;color:#333;}`,
    shaded: `.book blockquote{margin:0 0 1.1em;padding:0.8em 1em;background:rgba(0,0,0,0.05);border-left:3px solid rgba(0,0,0,0.25);color:#333;}`,
    centered: `.book blockquote{margin:1em 1.5em;text-align:center;font-style:italic;color:#444;border:0;}`,
    'quote-mark': `.book blockquote{margin:0 0 1.1em;position:relative;padding-left:2em;color:#444;}
.book blockquote::before{content:"\\201C";font-family:${hf};font-size:3em;line-height:0.8;position:absolute;left:0;top:0;opacity:0.25;}`,
    'both-indent': `.book blockquote{margin:1em 2.2em;font-style:italic;color:#444;border:0;}`,
    'double-rule': `.book blockquote{margin:1em 0;padding:0.7em 0;border-top:3px double #ccc;border-bottom:3px double #ccc;color:#444;}`,
  };
  return v[key ?? 'left-rule'] ?? v['left-rule']!;
}
