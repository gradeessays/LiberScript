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
  [new RegExp(`^(part|book|volume)\\s+(\\d{1,4}|[ivxlcdm]+|${NUMBER_WORDS})\\b`, 'i'), ChapterKind.PART],
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

/** Copyright/legal lines that *carry* the legal text (kept as body, not a label). */
function isCopyrightText(text: string): boolean {
  return /^\s*(copyright\b|©|\(c\)\s)/i.test(text) || /\ball rights reserved\b/i.test(text);
}

/**
 * A short, title-cased standalone line that reads like a section label
 * ("Prologue", "Chapter One", "About the Author") rather than prose. Used so we
 * can recognize sections even when the source styled them as plain paragraphs
 * (the common DOCX/PDF case) instead of real headings.
 */
function isLabelLine(text: string): boolean {
  const t = text.trim();
  const wc = wordCount(t);
  if (wc < 1 || wc > 7) return false;
  if (!/^[\p{Lu}\p{N}]/u.test(t)) return false; // starts with a capital or digit
  if (wc > 1 && /[.!?]["')\]]?$/.test(t)) return false; // multi-word sentences aren't labels
  return true;
}

/**
 * Resolve a block to a section boundary, working for both real headings and
 * label-like paragraphs. `consumesLine` is false when the line itself carries
 * content that must stay in the body (copyright/legal text).
 */
function blockHeading(block: ContentBlock): (HeadingMatch & { consumesLine: boolean }) | null {
  const text = block.text.trim();
  let m: HeadingMatch | null = null;

  if (block.kind === 'heading') {
    m = classifyHeading(text, true);
  } else if (isCopyrightText(text)) {
    m = { kind: ChapterKind.COPYRIGHT, title: 'Copyright' };
  } else if (isLabelLine(text)) {
    const c = classifyHeading(text, false);
    if (c && c.kind !== ChapterKind.COPYRIGHT) m = c;
  }
  if (!m) return null;

  // A bare "Copyright" label introduces a section whose body follows; a line that
  // already contains the legal text must be preserved as that section's body.
  let consumesLine = true;
  if (m.kind === ChapterKind.COPYRIGHT) {
    consumesLine = /^(copyright|disclaimer|legal notice|legal|imprint)s?\s*:?\.?$/i.test(text);
  }
  return { ...m, consumesLine };
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

/** Page locator at the end of a TOC listing line ("… 17", "… ix"). */
const LOCATOR_RE = /\s(\d{1,4}|[ivxlcdm]{1,7})$/i;

/**
 * While inside a parsed Table of Contents, listing lines often look exactly
 * like real section headings ("Chapter 2: The Architecture 17"). Decide whether
 * a classified heading is just a TOC entry: it carries a trailing page locator,
 * or the next line is another locator-bearing listing line. Real sections are
 * followed by prose, which breaks the pattern and ends the TOC.
 */
function isTocListingLine(cls: HeadingMatch, next: ContentBlock | undefined): boolean {
  if (cls.subtitle && LOCATOR_RE.test(cls.subtitle.trim())) return true;
  if (!next) return false;
  const nt = next.text.trim();
  if (blockHeading(next)) {
    // Back-to-back headings inside a TOC are a listing — if they look paginated.
    return LOCATOR_RE.test(nt);
  }
  return LOCATOR_RE.test(nt) && wordCount(nt) <= 12;
}

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
  const firstIdx = blocks.findIndex((b) => blockHeading(b));
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
  for (let bi = 0; bi < rest.length; bi += 1) {
    const block = rest[bi]!;
    const cls = blockHeading(block);
    if (cls) {
      // Consecutive copyright/legal lines stay in the one copyright section.
      if (cls.kind === ChapterKind.COPYRIGHT && current?.kind === ChapterKind.COPYRIGHT) {
        if (!cls.consumesLine) current.blocks.push(block);
        continue;
      }
      // TOC listing lines masquerade as section headings — keep them in the TOC
      // (its blocks are emptied later) instead of spawning ghost chapters.
      if (current?.kind === ChapterKind.TOC && isTocListingLine(cls, rest[bi + 1])) {
        current.blocks.push(block);
        continue;
      }
      if (current) chapters.push(current);
      current = { kind: cls.kind, title: cls.title, blocks: [] };
      // A content-bearing line (copyright/legal text) stays in the body.
      if (!cls.consumesLine) current.blocks.push(block);
      // Only chapters/parts capture a trailing line as a subtitle; structured
      // front matter (copyright, dedication, …) keeps its first line as body.
      const subtitleable = cls.kind === ChapterKind.CHAPTER || cls.kind === ChapterKind.PART;
      if (cls.subtitle) {
        current.subtitle = cls.subtitle;
        awaitingSubtitle = false;
      } else {
        awaitingSubtitle = subtitleable && cls.consumesLine;
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
