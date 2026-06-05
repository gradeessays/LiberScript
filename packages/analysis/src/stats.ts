import { WORDS_PER_MINUTE, countWords } from '@liberscript/core';
import { chapterText } from './chapters';
import type { ManuscriptStats, ParsedChapter } from './types';

/** Aggregate stats across all chapters (titles + subtitles + body). */
export function computeStats(chapters: ParsedChapter[]): ManuscriptStats {
  let wordCount = 0;
  let charCount = 0;
  for (const ch of chapters) {
    const text = `${ch.title} ${ch.subtitle ?? ''} ${chapterText(ch)}`;
    wordCount += countWords(text);
    charCount += text.length;
  }
  return {
    wordCount,
    charCount,
    readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
  };
}
