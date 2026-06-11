/** Typed book elements. A book is an ordered list of these. */
export const ChapterKind = {
  TITLE_PAGE: 'TITLE_PAGE',
  COPYRIGHT: 'COPYRIGHT',
  EPIGRAPH: 'EPIGRAPH',
  DEDICATION: 'DEDICATION',
  TOC: 'TOC',
  FOREWORD: 'FOREWORD',
  PREFACE: 'PREFACE',
  PROLOGUE: 'PROLOGUE',
  INTRODUCTION: 'INTRODUCTION',
  PART: 'PART',
  CHAPTER: 'CHAPTER',
  EPILOGUE: 'EPILOGUE',
  AFTERWORD: 'AFTERWORD',
  ACKNOWLEDGMENTS: 'ACKNOWLEDGMENTS',
  ABOUT_AUTHOR: 'ABOUT_AUTHOR',
  ALSO_BY: 'ALSO_BY',
  APPENDIX: 'APPENDIX',
} as const;
export type ChapterKind = (typeof ChapterKind)[keyof typeof ChapterKind];

export const FRONT_MATTER_KINDS: ChapterKind[] = [
  ChapterKind.TITLE_PAGE,
  ChapterKind.COPYRIGHT,
  ChapterKind.EPIGRAPH,
  ChapterKind.DEDICATION,
  ChapterKind.TOC,
  ChapterKind.FOREWORD,
  ChapterKind.PREFACE,
  ChapterKind.PROLOGUE,
  ChapterKind.INTRODUCTION,
];
export const BODY_KINDS: ChapterKind[] = [ChapterKind.PART, ChapterKind.CHAPTER];
export const BACK_MATTER_KINDS: ChapterKind[] = [
  ChapterKind.EPILOGUE,
  ChapterKind.AFTERWORD,
  ChapterKind.ACKNOWLEDGMENTS,
  ChapterKind.ABOUT_AUTHOR,
  ChapterKind.ALSO_BY,
  ChapterKind.APPENDIX,
];

export type SectionGroup = 'front' | 'body' | 'back';

export function groupOfKind(kind: ChapterKind): SectionGroup {
  if (BODY_KINDS.includes(kind)) return 'body';
  if (BACK_MATTER_KINDS.includes(kind)) return 'back';
  return 'front';
}

/** Kinds that use a structured form instead of the prose editor. */
export const STRUCTURED_KINDS: ChapterKind[] = [ChapterKind.TITLE_PAGE, ChapterKind.COPYRIGHT];
/** Kinds whose content is auto-generated (read-only in the editor). */
export const AUTO_KINDS: ChapterKind[] = [ChapterKind.TOC];

export const KIND_LABELS: Record<ChapterKind, string> = {
  TITLE_PAGE: 'Title Page',
  COPYRIGHT: 'Copyright & Disclaimer',
  EPIGRAPH: 'Epigraph',
  DEDICATION: 'Dedication',
  TOC: 'Table of Contents',
  FOREWORD: 'Foreword',
  PREFACE: 'Preface',
  PROLOGUE: 'Prologue',
  INTRODUCTION: 'Introduction',
  PART: 'Part',
  CHAPTER: 'Chapter',
  EPILOGUE: 'Epilogue',
  AFTERWORD: 'Afterword',
  ACKNOWLEDGMENTS: 'Acknowledgments',
  ABOUT_AUTHOR: 'About the Author',
  ALSO_BY: 'Also By',
  APPENDIX: 'Appendix',
};

/** Standard KDP trim sizes (inches) plus the option of a custom size. */
export interface TrimSize {
  key: string;
  name: string;
  widthIn: number;
  heightIn: number;
}

export const KDP_TRIM_SIZES: TrimSize[] = [
  { key: '5x8', name: '5 × 8 in', widthIn: 5, heightIn: 8 },
  { key: '5.06x7.81', name: '5.06 × 7.81 in', widthIn: 5.06, heightIn: 7.81 },
  { key: '5.25x8', name: '5.25 × 8 in', widthIn: 5.25, heightIn: 8 },
  { key: '5.5x8.5', name: '5.5 × 8.5 in', widthIn: 5.5, heightIn: 8.5 },
  { key: '6x9', name: '6 × 9 in (most common)', widthIn: 6, heightIn: 9 },
  { key: '6.14x9.21', name: '6.14 × 9.21 in', widthIn: 6.14, heightIn: 9.21 },
  { key: '7x10', name: '7 × 10 in', widthIn: 7, heightIn: 10 },
  { key: '8x10', name: '8 × 10 in', widthIn: 8, heightIn: 10 },
  { key: '8.5x11', name: '8.5 × 11 in', widthIn: 8.5, heightIn: 11 },
];

/** Per-book typography overrides applied on top of the chosen theme. */
export interface TypographyOverrides {
  /** Body font-size scale as a percent of the theme default (e.g. 110). */
  fontScalePct?: number;
  lineHeight?: number;
  paragraphSpacingEm?: number;
  /** Override trim size; `custom` allows arbitrary W×H. */
  trimKey?: string;
  customTrim?: { widthIn: number; heightIn: number };
  /** Page margin overrides in inches (print); partial, merged over the theme. */
  marginsIn?: { top?: number; bottom?: number; inner?: number; outer?: number };
  bodyFontKey?: string;
  headingFontKey?: string;
  /** Block paragraphs (no indent, spaced) vs. indented. */
  blockParagraphs?: boolean;
  /** Selected chapter-start design (from the chapter-style library). */
  chapterStyleKey?: string;
  /** Selected opening-quote (epigraph) presentation style. */
  openingQuoteStyleKey?: string;
  /** Selected block-quote presentation style for body content. */
  blockQuoteStyleKey?: string;
  /** Each chapter/section starts on a fresh page (print). Default true. */
  chaptersNewPage?: boolean;
  /** Chapters/sections start on a right-hand (odd) page (print). */
  sectionsRecto?: boolean;
  /** Print page folios (page numbers). Default true. */
  pageNumbers?: boolean;
  /** Folio position. Default 'bottom-center'. */
  pageNumberPlacement?: PageNumberPlacement;
  /** Running headers at the top of body pages (print). Default true. */
  runningHeaders?: boolean;
  /** What the left-hand (verso / even) running header shows. Default 'bookTitle'. */
  headerVersoContent?: HeaderContent;
  /** What the right-hand (recto / odd) running header shows. Default 'chapterTitle'. */
  headerRectoContent?: HeaderContent;
  /** Subtitle text style — one of the SUBTITLE_STYLES keys. Default 'italic'. */
  subtitleStyleKey?: string;
  /** Gap (em) between the chapter title line and the subtitle. Default 0.3. */
  subtitleSpacingEm?: number;
  /** Gap (em) between the heading block and the body / opening quote. Default 1.6. */
  headingSpacingEm?: number;
}

/** Content a running header can display. `chapterTitle` updates per chapter. */
export type HeaderContent = 'author' | 'bookTitle' | 'chapterTitle' | 'none';
export type PageNumberPlacement = 'bottom-center' | 'bottom-outer' | 'top-outer';

/** Genres that drive the copyright/disclaimer template. */
export const BookGenre = {
  FICTION: 'fiction',
  NONFICTION: 'nonfiction',
  SELFHELP: 'selfhelp',
  POETRY: 'poetry',
  CHILDRENS: 'childrens',
} as const;
export type BookGenre = (typeof BookGenre)[keyof typeof BookGenre];
