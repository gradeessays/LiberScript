import type { ContentBlock, ParsedChapter } from './types';

/**
 * A heading text marks the start of a new chapter only if it begins with a
 * recognized chapter/section keyword. This deliberately ignores arbitrary
 * sub-headings so that a "Chapter N" book is not over-split by its subsections.
 */
const CHAPTER_HEADING = [
  /^chapter\b/i,
  /^(part|book)\s+([0-9]+|[ivxlcdm]+|[a-z]+)\b/i,
  /^(prologue|epilogue|introduction|preface|foreword|afterword|appendix|prelude|interlude)\b/i,
];

export function isChapterHeading(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && CHAPTER_HEADING.some((re) => re.test(t));
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/u).length : 0;
}

/** A short heading or truncated, unpunctuated phrase reads as a subtitle. */
function isSubtitleCandidate(block: ContentBlock): boolean {
  const wc = wordCount(block.text);
  if (block.kind === 'heading') {
    return !isChapterHeading(block.text) && wc > 0 && wc <= 14;
  }
  // A short paragraph with no sentence-ending punctuation = title-like phrase.
  return wc > 0 && wc <= 12 && !/[.!?]["')\]]?$/.test(block.text.trim());
}

/**
 * Assemble chapters from an ordered block stream. New chapters begin only at
 * chapter headings; a qualifying block immediately after the title becomes the
 * subtitle; all other headings/paragraphs fold into the chapter body.
 *
 * If the document has no chapter headings at all, falls back to splitting on
 * the shallowest heading level present, else a single chapter.
 */
export function assembleChapters(blocks: ContentBlock[]): ParsedChapter[] {
  if (!blocks.some((b) => b.kind === 'heading' && isChapterHeading(b.text))) {
    return fallbackChapters(blocks);
  }

  const chapters: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;
  let awaitingSubtitle = false;

  for (const block of blocks) {
    if (block.kind === 'heading' && isChapterHeading(block.text)) {
      if (current) chapters.push(current);
      current = { title: block.text.trim(), blocks: [] };
      awaitingSubtitle = true;
      continue;
    }

    if (!current) current = { title: 'Front Matter', blocks: [] };

    if (awaitingSubtitle) {
      awaitingSubtitle = false;
      if (!current.subtitle && isSubtitleCandidate(block)) {
        current.subtitle = block.text.trim();
        continue;
      }
    }
    current.blocks.push(block);
  }
  if (current) chapters.push(current);

  return chapters.filter((c) => c.blocks.length > 0 || c.subtitle);
}

/** No chapter markers: split on the shallowest heading level, or one chapter. */
function fallbackChapters(blocks: ContentBlock[]): ParsedChapter[] {
  const levels = blocks.filter((b) => b.kind === 'heading').map((b) => (b as { level: number }).level);
  if (levels.length === 0) {
    return [{ title: 'Chapter 1', blocks }];
  }
  const top = Math.min(...levels);
  const chapters: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;

  for (const block of blocks) {
    if (block.kind === 'heading' && block.level === top) {
      if (current) chapters.push(current);
      current = { title: block.text.trim(), blocks: [] };
    } else {
      if (!current) current = { title: 'Chapter 1', blocks: [] };
      current.blocks.push(block);
    }
  }
  if (current) chapters.push(current);
  return chapters.filter((c) => c.blocks.length > 0);
}

/** Flatten a chapter's body blocks back to plain text (for stats/preview). */
export function chapterText(chapter: ParsedChapter): string {
  return chapter.blocks
    .map((b) => b.text)
    .join('\n\n')
    .trim();
}
