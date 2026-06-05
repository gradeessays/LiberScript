import type { BookTheme, FontSpec } from './types';

/** Curated free (open-licensed) fonts available to all users. */
export const FONTS = {
  ebGaramond: {
    name: 'EB Garamond',
    stack: "'EB Garamond', Garamond, 'Times New Roman', serif",
    google: 'EB+Garamond:ital,wght@0,400;0,700;1,400',
  },
  lora: {
    name: 'Lora',
    stack: "'Lora', Georgia, serif",
    google: 'Lora:ital,wght@0,400;0,700;1,400',
  },
  merriweather: {
    name: 'Merriweather',
    stack: "'Merriweather', Georgia, serif",
    google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,400',
  },
  sourceSerif: {
    name: 'Source Serif 4',
    stack: "'Source Serif 4', Georgia, serif",
    google: 'Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400',
  },
  spectral: {
    name: 'Spectral',
    stack: "'Spectral', Georgia, serif",
    google: 'Spectral:ital,wght@0,400;0,600;1,400',
  },
  inter: {
    name: 'Inter',
    stack: "'Inter', system-ui, sans-serif",
    google: 'Inter:wght@400;600;700',
  },
  nunito: {
    name: 'Nunito',
    stack: "'Nunito', system-ui, sans-serif",
    google: 'Nunito:ital,wght@0,400;0,700;1,400',
  },
  playfair: {
    name: 'Playfair Display',
    stack: "'Playfair Display', Georgia, serif",
    google: 'Playfair+Display:wght@400;700',
  },
} satisfies Record<string, FontSpec>;

export const THEMES: BookTheme[] = [
  {
    key: 'novel-classic',
    name: 'Classic Novel',
    genre: 'novel',
    bodyFont: FONTS.ebGaramond,
    headingFont: FONTS.ebGaramond,
    baseFontPt: 11.5,
    lineHeight: 1.5,
    paragraph: { indentEm: 1.4, spacingEm: 0, justify: true, firstParaPlain: true },
    chapterStart: {
      style: 'ornament',
      align: 'center',
      dropCap: true,
      smallCapsFirstLine: true,
      ornament: '❧',
    },
    sceneBreak: { style: 'asterism', glyph: '* * *' },
    trim: { widthIn: 5, heightIn: 8 },
    marginsIn: { top: 0.75, bottom: 0.75, inner: 0.75, outer: 0.5 },
  },
  {
    key: 'novel-modern',
    name: 'Modern Novel',
    genre: 'novel',
    bodyFont: FONTS.lora,
    headingFont: FONTS.inter,
    baseFontPt: 11,
    lineHeight: 1.55,
    paragraph: { indentEm: 1.2, spacingEm: 0, justify: true, firstParaPlain: true },
    chapterStart: { style: 'rule', align: 'left', dropCap: false, smallCapsFirstLine: false },
    sceneBreak: { style: 'glyph', glyph: '◆' },
    trim: { widthIn: 5.25, heightIn: 8 },
    marginsIn: { top: 0.75, bottom: 0.75, inner: 0.75, outer: 0.5 },
  },
  {
    key: 'selfhelp',
    name: 'Self-Help & Non-fiction',
    genre: 'nonfiction',
    bodyFont: FONTS.sourceSerif,
    headingFont: FONTS.inter,
    baseFontPt: 11,
    lineHeight: 1.6,
    paragraph: { indentEm: 0, spacingEm: 0.8, justify: false, firstParaPlain: true },
    chapterStart: { style: 'number', align: 'left', dropCap: false, smallCapsFirstLine: false },
    sceneBreak: { style: 'rule' },
    trim: { widthIn: 6, heightIn: 9 },
    marginsIn: { top: 0.85, bottom: 0.85, inner: 0.85, outer: 0.6 },
  },
  {
    key: 'poetry',
    name: 'Poetry',
    genre: 'poetry',
    bodyFont: FONTS.spectral,
    headingFont: FONTS.playfair,
    baseFontPt: 12,
    lineHeight: 1.5,
    paragraph: { indentEm: 0, spacingEm: 0.6, justify: false, firstParaPlain: true },
    chapterStart: { style: 'centered', align: 'center', dropCap: false, smallCapsFirstLine: false },
    sceneBreak: { style: 'blank' },
    trim: { widthIn: 5.5, heightIn: 8.5 },
    marginsIn: { top: 0.8, bottom: 0.8, inner: 0.8, outer: 0.7 },
  },
  {
    key: 'childrens',
    name: "Children's",
    genre: 'childrens',
    bodyFont: FONTS.nunito,
    headingFont: FONTS.nunito,
    baseFontPt: 13,
    lineHeight: 1.7,
    paragraph: { indentEm: 0, spacingEm: 0.8, justify: false, firstParaPlain: true },
    chapterStart: { style: 'centered', align: 'center', dropCap: false, smallCapsFirstLine: false },
    sceneBreak: { style: 'glyph', glyph: '★' },
    trim: { widthIn: 8, heightIn: 8 },
    marginsIn: { top: 0.6, bottom: 0.6, inner: 0.6, outer: 0.6 },
  },
  {
    key: 'elegant-serif',
    name: 'Elegant Serif',
    genre: 'novel',
    premium: true,
    bodyFont: FONTS.merriweather,
    headingFont: FONTS.playfair,
    baseFontPt: 11.5,
    lineHeight: 1.6,
    paragraph: { indentEm: 1.3, spacingEm: 0, justify: true, firstParaPlain: true },
    chapterStart: {
      style: 'ornament',
      align: 'center',
      dropCap: true,
      smallCapsFirstLine: true,
      ornament: '⁂',
    },
    sceneBreak: { style: 'asterism', glyph: '⁂' },
    trim: { widthIn: 6, heightIn: 9 },
    marginsIn: { top: 0.85, bottom: 0.85, inner: 0.85, outer: 0.6 },
  },
];

export const THEME_BY_KEY: Record<string, BookTheme> = Object.fromEntries(
  THEMES.map((t) => [t.key, t]),
);

export const DEFAULT_THEME_KEY = 'novel-classic';

export function getTheme(key: string | null | undefined): BookTheme {
  return (key && THEME_BY_KEY[key]) || THEME_BY_KEY[DEFAULT_THEME_KEY]!;
}
