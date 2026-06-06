import type { BookTheme } from './types';

export type NumberFormat = 'none' | 'arabic' | 'roman' | 'word' | 'c-arabic' | 'c-roman' | 'c-word';
export type NumberPlacement = 'none' | 'inline' | 'above' | 'big' | 'label';
export type OrnPlacement = 'above' | 'below' | 'both' | 'sides';

export interface ChapterStartStyle {
  key: string;
  name: string;
  number: NumberFormat;
  numPlace: NumberPlacement;
  align: 'left' | 'center' | 'right';
  titleCase: 'normal' | 'upper' | 'smallcaps';
  ornament?: string;
  ornPlace?: OrnPlacement;
  rule?: 'above' | 'below' | 'both';
  dropCap?: boolean;
  firstLineSmallCaps?: boolean;
  titleSize?: number;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toRoman(n: number): string {
  if (n <= 0) return String(n);
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let r = '';
  let x = n;
  for (const [v, s] of map) while (x >= v) { r += s; x -= v; }
  return r;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function toWord(n: number): string {
  if (n <= 0) return String(n);
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)]!;
    const o = n % 10;
    return o ? `${t}-${ONES[o]}` : t;
  }
  return String(n);
}

function formatNumber(fmt: NumberFormat, index: number): string {
  switch (fmt) {
    case 'arabic': return String(index);
    case 'roman': return toRoman(index);
    case 'word': return toWord(index);
    case 'c-arabic': return `Chapter ${index}`;
    case 'c-roman': return `Chapter ${toRoman(index)}`;
    case 'c-word': return `Chapter ${toWord(index)}`;
    default: return '';
  }
}

/** CSS for the active chapter-start style. */
export function chapterStyleCss(s: ChapterStartStyle, theme: BookTheme): string {
  const tcase =
    s.titleCase === 'upper'
      ? 'text-transform:uppercase;letter-spacing:0.04em;'
      : s.titleCase === 'smallcaps'
        ? 'font-variant:small-caps;letter-spacing:0.03em;'
        : '';
  let css = `.book .chapter-heading{text-align:${s.align};margin:0 0 1.8em;}
.book .chapter-title{font-family:${theme.headingFont.stack};font-weight:700;font-size:${s.titleSize ?? 1.8}em;margin:0;line-height:1.15;${tcase}}
.book .chapter-subtitle{font-family:${theme.headingFont.stack};font-style:italic;color:#555;margin-top:0.35em;}
.book .cs-num{font-family:${theme.headingFont.stack};text-transform:uppercase;letter-spacing:0.25em;font-size:0.85em;color:#777;margin-bottom:0.5em;}
.book .cs-num-big{font-family:${theme.headingFont.stack};font-weight:800;font-size:4.6em;line-height:0.9;color:rgba(0,0,0,0.12);margin-bottom:-0.05em;}
.book .cs-num-label{font-variant:small-caps;letter-spacing:0.3em;color:#999;font-size:0.82em;margin-bottom:0.55em;}
.book .cs-orn{font-size:1.5em;opacity:0.65;margin:0.35em 0;line-height:1;}
.book .cs-flank{opacity:0.55;font-size:0.7em;vertical-align:middle;}`;
  if (s.rule === 'above' || s.rule === 'both')
    css += `\n.book .chapter-heading{padding-top:0.6em;border-top:1.5px solid currentColor;}`;
  if (s.rule === 'below' || s.rule === 'both')
    css += `\n.book .chapter-title{padding-bottom:0.3em;border-bottom:1.5px solid currentColor;display:inline-block;}`;
  if (s.dropCap)
    css += `\n.book .chapter-body>p:first-of-type::first-letter{float:left;font-family:${theme.headingFont.stack};font-size:3.4em;line-height:0.78;padding:0.02em 0.08em 0 0;font-weight:700;}`;
  if (s.firstLineSmallCaps)
    css += `\n.book .chapter-body>p:first-of-type::first-line{font-variant:small-caps;letter-spacing:0.02em;}`;
  return css;
}

/** Heading HTML for the active chapter-start style. */
export function chapterHeadingHtml(
  s: ChapterStartStyle,
  ctx: { index: number; title: string; subtitle?: string | null },
): string {
  const num = formatNumber(s.number, ctx.index);
  const orn = s.ornament ?? '';
  const ornDiv = `<div class="cs-orn">${orn}</div>`;
  const ornAbove = orn && (s.ornPlace === 'above' || s.ornPlace === 'both') ? ornDiv : '';
  const ornBelow = orn && (s.ornPlace === 'below' || s.ornPlace === 'both') ? ornDiv : '';

  let numEl = '';
  if (num && s.numPlace === 'above') numEl = `<div class="cs-num">${esc(num)}</div>`;
  else if (num && s.numPlace === 'big') numEl = `<div class="cs-num-big">${esc(num)}</div>`;
  else if (num && s.numPlace === 'label') numEl = `<div class="cs-num-label">${esc(num)}</div>`;

  let titleText = ctx.title;
  if (num && s.numPlace === 'inline') titleText = `${num}. ${ctx.title}`;

  const flank = orn && s.ornPlace === 'sides';
  const titleHtml = `<h1 class="chapter-title">${flank ? `<span class="cs-flank">${orn}</span> ` : ''}${esc(titleText)}${flank ? ` <span class="cs-flank">${orn}</span>` : ''}</h1>`;
  const sub = ctx.subtitle ? `<div class="chapter-subtitle">${esc(ctx.subtitle)}</div>` : '';

  return `<header class="chapter-heading">${ornAbove}${numEl}${titleHtml}${sub}${ornBelow}</header>`;
}

type Partial0 = Partial<ChapterStartStyle> & { key: string; name: string };
function st(p: Partial0): ChapterStartStyle {
  return { number: 'none', numPlace: 'none', align: 'center', titleCase: 'normal', ...p };
}

const ORN = ['❧', '☙', '⁂', '✦', '✧', '◆', '◇', '❖', '✶', '❀', '✤', '❦', '◈', '❉', '✻', '✫', '⚜', '♦'];

const CURATED: ChapterStartStyle[] = [
  st({ key: 'plain-center', name: 'Plain · Centered' }),
  st({ key: 'plain-left', name: 'Plain · Left', align: 'left' }),
  st({ key: 'num-arabic-center', name: 'Number · Centered', number: 'arabic', numPlace: 'above' }),
  st({ key: 'num-arabic-left', name: 'Number · Left', number: 'arabic', numPlace: 'above', align: 'left' }),
  st({ key: 'num-roman-center', name: 'Roman Numeral · Centered', number: 'roman', numPlace: 'above' }),
  st({ key: 'num-word-center', name: 'Spelled Number · Centered', number: 'word', numPlace: 'above' }),
  st({ key: 'chapter-arabic-center', name: 'Chapter N · Centered', number: 'c-arabic', numPlace: 'above' }),
  st({ key: 'chapter-arabic-left', name: 'Chapter N · Left', number: 'c-arabic', numPlace: 'above', align: 'left' }),
  st({ key: 'chapter-roman-center', name: 'Chapter (Roman) · Centered', number: 'c-roman', numPlace: 'above' }),
  st({ key: 'chapter-word-center', name: 'Chapter (Word) · Centered', number: 'c-word', numPlace: 'above' }),
  st({ key: 'chapter-word-left', name: 'Chapter (Word) · Left', number: 'c-word', numPlace: 'above', align: 'left' }),
  st({ key: 'label-arabic', name: 'Label · Number', number: 'c-arabic', numPlace: 'label' }),
  st({ key: 'inline-arabic-left', name: 'Inline “N. Title” · Left', number: 'arabic', numPlace: 'inline', align: 'left' }),
  st({ key: 'inline-arabic-center', name: 'Inline “N. Title”', number: 'arabic', numPlace: 'inline' }),
  st({ key: 'big-arabic', name: 'Big Number', number: 'arabic', numPlace: 'big' }),
  st({ key: 'big-arabic-left', name: 'Big Number · Left', number: 'arabic', numPlace: 'big', align: 'left' }),
  st({ key: 'big-roman', name: 'Big Roman Numeral', number: 'roman', numPlace: 'big' }),
  st({ key: 'big-word', name: 'Big Spelled Number', number: 'word', numPlace: 'big' }),
  st({ key: 'big-arabic-dropcap', name: 'Big Number + Drop Cap', number: 'arabic', numPlace: 'big', dropCap: true }),
  st({ key: 'big-roman-upper', name: 'Big Roman + Caps Title', number: 'roman', numPlace: 'big', titleCase: 'upper' }),
  st({ key: 'rule-below-center', name: 'Rule Below · Centered', rule: 'below' }),
  st({ key: 'rule-below-left', name: 'Rule Below · Left', rule: 'below', align: 'left' }),
  st({ key: 'rule-above-center', name: 'Rule Above', rule: 'above' }),
  st({ key: 'rules-both', name: 'Rules Above & Below', rule: 'both' }),
  st({ key: 'rule-num-roman', name: 'Roman + Rule Below', number: 'roman', numPlace: 'above', rule: 'below' }),
  st({ key: 'upper-center', name: 'Uppercase Title', titleCase: 'upper' }),
  st({ key: 'upper-left', name: 'Uppercase · Left', titleCase: 'upper', align: 'left' }),
  st({ key: 'smallcaps-center', name: 'Small-Caps Title', titleCase: 'smallcaps' }),
  st({ key: 'upper-rule', name: 'Uppercase + Rule', titleCase: 'upper', rule: 'below' }),
  st({ key: 'smallcaps-num', name: 'Small-Caps + Number', titleCase: 'smallcaps', number: 'arabic', numPlace: 'above' }),
  st({ key: 'dropcap-plain', name: 'Drop Cap', dropCap: true }),
  st({ key: 'dropcap-num', name: 'Drop Cap + Number', dropCap: true, number: 'arabic', numPlace: 'above' }),
  st({ key: 'dropcap-firstline', name: 'Drop Cap + Small-Caps Line', dropCap: true, firstLineSmallCaps: true }),
  st({ key: 'asterism', name: 'Asterism ⁂', ornament: '⁂', ornPlace: 'above', number: 'roman', numPlace: 'above' }),
  st({ key: 'orn-both-fleuron', name: 'Fleurons Above & Below ❧', ornament: '❧', ornPlace: 'both' }),
  st({ key: 'orn-both-diamond', name: 'Diamonds Above & Below ◆', ornament: '◆', ornPlace: 'both' }),
];

const generated: ChapterStartStyle[] = [];
ORN.forEach((g, i) =>
  generated.push(st({ key: `orn-above-${i}`, name: `Ornament ${g} · Above`, ornament: g, ornPlace: 'above' })),
);
ORN.slice(0, 8).forEach((g, i) =>
  generated.push(st({ key: `orn-flank-${i}`, name: `Flanked ${g}`, ornament: g, ornPlace: 'sides' })),
);
ORN.slice(0, 6).forEach((g, i) =>
  generated.push(
    st({ key: `orn-roman-${i}`, name: `${g} + Roman Numeral`, ornament: g, ornPlace: 'above', number: 'roman', numPlace: 'above' }),
  ),
);

export const CHAPTER_STYLES: ChapterStartStyle[] = [...CURATED, ...generated];

export const CHAPTER_STYLE_BY_KEY: Record<string, ChapterStartStyle> = Object.fromEntries(
  CHAPTER_STYLES.map((s) => [s.key, s]),
);

export function getChapterStyle(key: string | null | undefined): ChapterStartStyle | undefined {
  return key ? CHAPTER_STYLE_BY_KEY[key] : undefined;
}
