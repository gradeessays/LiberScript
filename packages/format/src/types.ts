export type Genre = 'novel' | 'nonfiction' | 'poetry' | 'childrens' | 'academic' | 'classic';
export type RenderTarget = 'print' | 'ebook';

export interface FontSpec {
  name: string;
  /** CSS font stack used when rendering. */
  stack: string;
  /** Google Fonts family spec for preview, e.g. "EB+Garamond:ital,wght@0,400;1,400". */
  google?: string;
}

export interface ChapterStart {
  style: 'plain' | 'rule' | 'ornament' | 'number' | 'centered';
  align: 'left' | 'center';
  dropCap: boolean;
  smallCapsFirstLine: boolean;
  /** Glyph for the `ornament` style. */
  ornament?: string;
}

export interface SceneBreak {
  style: 'blank' | 'asterism' | 'rule' | 'glyph';
  glyph?: string;
}

export interface BookTheme {
  key: string;
  name: string;
  genre: Genre;
  /** Gated behind a paid plan when true. */
  premium?: boolean;
  bodyFont: FontSpec;
  headingFont: FontSpec;
  baseFontPt: number;
  lineHeight: number;
  paragraph: {
    indentEm: number;
    spacingEm: number;
    justify: boolean;
    /** Don't indent the first paragraph of a section (typographic convention). */
    firstParaPlain: boolean;
  };
  chapterStart: ChapterStart;
  sceneBreak: SceneBreak;
  /** Print trim size in inches. */
  trim: { widthIn: number; heightIn: number };
  marginsIn: { top: number; bottom: number; inner: number; outer: number };
}

export interface BookMeta {
  title: string;
  author?: string;
  publisherName?: string;
  /** Resolved URL to the publisher/imprint logo (optional). */
  logoUrl?: string;
  isbn?: string;
  year?: number;
  rights?: string;
}

export interface RenderChapter {
  index: number;
  title: string;
  subtitle?: string | null;
  /** Optional opening quote shown before the chapter body. */
  openingQuote?: string | null;
  openingQuoteAttribution?: string | null;
  /** TipTap/ProseMirror document for the chapter body. */
  content: unknown;
}

/** A typed book element (front matter, body, or back matter). */
export interface BookElement {
  kind: string;
  title?: string | null;
  subtitle?: string | null;
  /** Structured fields for form-based elements (title page, copyright). */
  data?: Record<string, unknown> | null;
  /** TipTap content for prose elements. */
  content?: unknown;
}

export interface TocEntry {
  index: number;
  title: string;
}

export interface RenderOptions {
  theme: BookTheme;
  target: RenderTarget;
  /** When true, include the "Made with Liberscript" attribution (free tier). */
  watermark: boolean;
}
