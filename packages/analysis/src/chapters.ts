import type { ContentBlock, ParsedChapter } from './types';

const SECTION_WORDS =
  'chapter|chapitre|kapitel|part|book|prologue|epilogue|introduction|preface|foreword|afterword|appendix|prelude|interlude';
const PREFIXED = new RegExp(`^(?:${SECTION_WORDS})\\b`, 'i');

const NUMBER_WORDS =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty';
// Match strictly, case-sensitive: chapter Roman numerals are written uppercase,
// which avoids treating ordinary words like "Mix" (a valid numeral, 1009) as one.
const STRICT_ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const BARE_TOKEN = new RegExp(`^(?:\\d{1,3}|${NUMBER_WORDS})$`, 'i');

/** Split a heading into title + optional inline subtitle at the first separator. */
function splitTitle(s: string): [string, string | undefined] {
  // Separators: colon, em/en dash, or a spaced hyphen (so "Twenty-One" stays intact).
  const sep = /\s*[:—–]\s*|\s+-\s+/.exec(s);
  if (sep && sep.index > 0) {
    const after = s.slice(sep.index + sep[0].length).trim();
    return [s.slice(0, sep.index).trim(), after || undefined];
  }
  return [s.trim(), undefined];
}

function isBareNumberToken(token: string): boolean {
  return BARE_TOKEN.test(token) || (token.length > 0 && STRICT_ROMAN.test(token));
}

export interface HeadingMatch {
  title: string;
  subtitle?: string;
}

/**
 * Recognize a chapter/section heading across many conventions:
 *   "Chapter 1", "Chapter I", "Chapter One", "Chapter 1: Title",
 *   "Chapter I — Title", "Prologue", and (when `allowBare`) "1" / "I" / "One"
 *   or "1: Title". The title before a separator is the heading; any text after
 *   the separator becomes the subtitle. Returns null when not a chapter.
 *
 * `allowBare` is enabled for structured documents (DOCX/EPUB/Markdown headings)
 * but NOT for raw text/PDF lines, where a bare number is more likely a list item.
 */
export function matchChapterHeading(text: string, allowBare = false): HeadingMatch | null {
  const t = text.trim();
  if (!t || t.length > 100) return null;

  if (PREFIXED.test(t)) {
    const [title, subtitle] = splitTitle(t);
    return { title, subtitle };
  }

  if (allowBare) {
    const [head, subtitle] = splitTitle(t);
    if (isBareNumberToken(head)) return { title: head, subtitle };
  }
  return null;
}

/** Strong (prefixed) chapter-heading check — used for raw text/PDF lines. */
export function isChapterHeading(text: string): boolean {
  return matchChapterHeading(text, false) !== null;
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/u).length : 0;
}

/** A short heading or truncated, unpunctuated phrase reads as a subtitle. */
function isSubtitleCandidate(block: ContentBlock): boolean {
  const wc = wordCount(block.text);
  if (block.kind === 'heading') {
    return !matchChapterHeading(block.text, true) && wc > 0 && wc <= 14;
  }
  return wc > 0 && wc <= 12 && !/[.!?]["')\]]?$/.test(block.text.trim());
}

/**
 * Assemble chapters from an ordered block stream. New chapters begin only at
 * chapter headings; an inline "Title" after a separator (or a qualifying block
 * right after the heading) becomes the subtitle; everything else folds into the
 * chapter body. Falls back to the shallowest heading level when there are no
 * chapter markers at all.
 */
export function assembleChapters(blocks: ContentBlock[]): ParsedChapter[] {
  if (!blocks.some((b) => b.kind === 'heading' && matchChapterHeading(b.text, true))) {
    return fallbackChapters(blocks);
  }

  const chapters: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;
  let awaitingSubtitle = false;

  for (const block of blocks) {
    const heading = block.kind === 'heading' ? matchChapterHeading(block.text, true) : null;
    if (heading) {
      if (current) chapters.push(current);
      current = { title: heading.title, blocks: [] };
      if (heading.subtitle) {
        current.subtitle = heading.subtitle;
        awaitingSubtitle = false;
      } else {
        awaitingSubtitle = true;
      }
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
  if (levels.length === 0) return [{ title: 'Chapter 1', blocks }];
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
