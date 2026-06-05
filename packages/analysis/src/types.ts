import type { SourceFormat } from '@liberscript/core';

/** A structural block of manuscript content (heading or paragraph). */
export type ContentBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; text: string };

export interface ParsedChapter {
  title: string;
  /** Optional secondary line beneath the chapter title (auto-detected). */
  subtitle?: string;
  /** Body content (sub-headings + paragraphs), excluding title/subtitle. */
  blocks: ContentBlock[];
}

export interface ManuscriptStats {
  wordCount: number;
  charCount: number;
  readingMinutes: number;
}

export interface ParsedManuscript {
  sourceFormat: SourceFormat;
  chapters: ParsedChapter[];
  stats: ManuscriptStats;
}
