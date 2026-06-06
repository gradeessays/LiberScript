import { ChapterKind } from '@liberscript/core';
import type { ContentBlock, ParsedChapter } from './types';

const NUMBER_WORDS =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty';
const STRICT_ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const BARE_TOKEN = new RegExp(`^(?:\\d{1,3}|${NUMBER_WORDS})$`, 'i');

/** Heading keyword → section kind. Order matters (first match wins). */
const SECTION_PATTERNS: [RegExp, ChapterKind][] = [
  [/^(copyright|disclaimer|legal|imprint)\b/i, ChapterKind.COPYRIGHT],
  [/^(table of contents|contents)\b/i, ChapterKind.TOC],
  [/^epigraph\b/i, ChapterKind.EPIGRAPH],
  [/^dedication\b/i, ChapterKind.DEDICATION],
  [/^foreword\b/i, ChapterKind.FOREWORD],
  [/^preface\b/i, ChapterKind.PREFACE],
  [/^prologue\b/i, ChapterKind.PROLOGUE],
  [/^(introduction|intro)\b/i, ChapterKind.INTRODUCTION],
  [/^(part|book)\s+([0-9]+|[ivxlcdm]+|[a-z]+)\b/i, ChapterKind.PART],
  [/^(chapter|chapitre|kapitel)\b/i, ChapterKind.CHAPTER],
  [/^epilogue\b/i, ChapterKind.EPILOGUE],
  [/^afterword\b/i, ChapterKind.AFTERWORD],
  [/^(acknowledge?ments?|acknowledgements)\b/i, ChapterKind.ACKNOWLEDGMENTS],
  [/^about the author\b/i, ChapterKind.ABOUT_AUTHOR],
  [/^also by\b/i, ChapterKind.ALSO_BY],
  [/^(appendix|appendices|glossary|notes|bibliography|references|index)\b/i, ChapterKind.APPENDIX],
];

function splitTitle(s: string): [string, string | undefined] {
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
  kind: ChapterKind;
  title: string;
  subtitle?: string;
}

/**
 * Classify a heading into a section kind (front matter, body, or back matter)
 * across many conventions. `allowBare` (structured docs only) also treats a bare
 * number / roman / spelled number as a CHAPTER.
 */
export function classifyHeading(text: string, allowBare = false): HeadingMatch | null {
  const t = text.trim();
  if (!t || t.length > 100) return null;
  for (const [re, kind] of SECTION_PATTERNS) {
    if (re.test(t)) {
      const [title, subtitle] = splitTitle(t);
      return { kind, title, subtitle };
    }
  }
  if (allowBare) {
    const [head, subtitle] = splitTitle(t);
    if (isBareNumberToken(head)) return { kind: ChapterKind.CHAPTER, title: head, subtitle };
  }
  return null;
}

/** Chapter-only heading match (back-compat; used for raw text/PDF line scans). */
export function matchChapterHeading(text: string, allowBare = false): HeadingMatch | null {
  const m = classifyHeading(text, allowBare);
  return m && (m.kind === ChapterKind.CHAPTER || m.kind === ChapterKind.PART) ? m : null;
}

/** True if a line is any recognized section heading (for text/PDF block-splitting). */
export function isSectionHeading(text: string): boolean {
  return classifyHeading(text, false) !== null;
}

export function isChapterHeading(text: string): boolean {
  return matchChapterHeading(text, false) !== null;
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/u).length : 0;
}

function totalWords(blocks: ContentBlock[]): number {
  return blocks.reduce((n, b) => n + wordCount(b.text), 0);
}

function isSubtitleCandidate(block: ContentBlock): boolean {
  const wc = wordCount(block.text);
  if (block.kind === 'heading') return !classifyHeading(block.text, true) && wc > 0 && wc <= 14;
  return wc > 0 && wc <= 12 && !/[.!?]["')\]]?$/.test(block.text.trim());
}

export function chapterText(chapter: ParsedChapter): string {
  return chapter.blocks
    .map((b) => b.text)
    .join('\n\n')
    .trim();
}

/** Guess the book title + author from the leading (pre-heading) lines. */
function detectTitleAuthor(blocks: ContentBlock[]): { title?: string; author?: string } {
  const lines = blocks
    .flatMap((b) => b.text.split('\n'))
    .map((s) => s.trim())
    .filter(Boolean);
  const title = lines[0];
  let author: string | undefined;
  for (const line of lines.slice(1, 6)) {
    const m = /^by\s+(.+)/i.exec(line);
    if (m) {
      author = m[1]!.trim();
      break;
    }
  }
  if (!author && lines[1] && lines[1].length <= 40 && wordCount(lines[1]) <= 6) author = lines[1];
  return { title, author };
}

const STRUCTURED_EMPTY = new Set<ChapterKind>([ChapterKind.TITLE_PAGE, ChapterKind.TOC]);

export interface AssembledBook {
  chapters: ParsedChapter[];
  title?: string;
  author?: string;
}

/**
 * Assemble a full, typed book from an ordered block stream: detect a title page,
 * then split into front-matter / body / back-matter sections at recognized
 * headings. Falls back to plain chapter splitting when nothing is recognized.
 */
export function assembleSections(blocks: ContentBlock[]): AssembledBook {
  const firstIdx = blocks.findIndex((b) => b.kind === 'heading' && classifyHeading(b.text, true));
  if (firstIdx === -1) {
    return { chapters: fallbackChapters(blocks) };
  }

  const leading = blocks.slice(0, firstIdx);
  const rest = blocks.slice(firstIdx);
  const chapters: ParsedChapter[] = [];
  let title: string | undefined;
  let author: string | undefined;

  if (leading.length > 0) {
    const ta = detectTitleAuthor(leading);
    if (leading.length <= 8 && totalWords(leading) < 60 && ta.title) {
      title = ta.title;
      author = ta.author;
      chapters.push({
        kind: ChapterKind.TITLE_PAGE,
        title: 'Title Page',
        blocks: [],
        data: { title: ta.title, ...(ta.author ? { author: ta.author } : {}) },
      });
    } else {
      chapters.push({ kind: ChapterKind.CHAPTER, title: 'Opening', blocks: leading });
    }
  }

  let current: ParsedChapter | null = null;
  let awaitingSubtitle = false;
  for (const block of rest) {
    const cls = block.kind === 'heading' ? classifyHeading(block.text, true) : null;
    if (cls) {
      if (current) chapters.push(current);
      current = { kind: cls.kind, title: cls.title, blocks: [] };
      // Only chapters/parts capture a trailing line as a subtitle; structured
      // front matter (copyright, dedication, …) keeps its first line as body.
      const subtitleable = cls.kind === ChapterKind.CHAPTER || cls.kind === ChapterKind.PART;
      if (cls.subtitle) {
        current.subtitle = cls.subtitle;
        awaitingSubtitle = false;
      } else {
        awaitingSubtitle = subtitleable;
      }
      continue;
    }
    if (!current) current = { kind: ChapterKind.CHAPTER, title: 'Chapter 1', blocks: [] };
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

  // Post-process structured kinds: TOC is auto-generated; copyright text is
  // preserved as editable customText; title-page body is form-driven.
  for (const c of chapters) {
    if (c.kind === ChapterKind.COPYRIGHT && c.blocks.length) {
      c.data = { ...(c.data ?? {}), customText: chapterText(c) };
      c.blocks = [];
    } else if (STRUCTURED_EMPTY.has(c.kind)) {
      c.blocks = [];
    }
  }

  return {
    chapters: chapters.filter(
      (c) => c.blocks.length > 0 || c.data || STRUCTURED_EMPTY.has(c.kind) || c.kind === ChapterKind.COPYRIGHT,
    ),
    title,
    author,
  };
}

/** No recognized sections: split on the shallowest heading level, or one chapter. */
function fallbackChapters(blocks: ContentBlock[]): ParsedChapter[] {
  const levels = blocks.filter((b) => b.kind === 'heading').map((b) => (b as { level: number }).level);
  if (levels.length === 0) return [{ kind: ChapterKind.CHAPTER, title: 'Chapter 1', blocks }];
  const top = Math.min(...levels);
  const chapters: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;
  for (const block of blocks) {
    if (block.kind === 'heading' && block.level === top) {
      if (current) chapters.push(current);
      current = { kind: ChapterKind.CHAPTER, title: block.text.trim(), blocks: [] };
    } else {
      if (!current) current = { kind: ChapterKind.CHAPTER, title: 'Chapter 1', blocks: [] };
      current.blocks.push(block);
    }
  }
  if (current) chapters.push(current);
  return chapters.filter((c) => c.blocks.length > 0);
}
