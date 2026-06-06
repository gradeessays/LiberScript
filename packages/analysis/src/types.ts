import type { ChapterKind, SourceFormat } from '@liberscript/core';

/** A structural block of manuscript content (heading or paragraph). */
export type ContentBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; text: string };

export interface ParsedChapter {
  /** Detected element type (title page, copyright, chapter, epilogue…). */
  kind: ChapterKind;
  title: string;
  /** Optional secondary line beneath the chapter title (auto-detected). */
  subtitle?: string;
  /** Body content (sub-headings + paragraphs), excluding title/subtitle. */
  blocks: ContentBlock[];
  /** Structured data for form-based elements (title page, copyright). */
  data?: Record<string, unknown>;
}

export interface ManuscriptStats {
  wordCount: number;
  charCount: number;
  readingMinutes: number;
}

export interface ParsedManuscript {
  sourceFormat: SourceFormat;
  /** Auto-detected book title (from the title page), if any. */
  title?: string;
  author?: string;
  chapters: ParsedChapter[];
  stats: ManuscriptStats;
}
