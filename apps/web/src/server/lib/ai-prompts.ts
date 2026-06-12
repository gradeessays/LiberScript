import type { BisacCategory } from '@liberscript/core';

/**
 * Prompt for extracting a reusable "voice" summary from a reference manuscript
 * excerpt — used by the Style Profile library so the AI Book Generator and
 * subsequent generation can adopt an author's established tone/voice.
 */
export function buildStyleProfilePrompt(excerpt: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a literary analyst helping an AI ghostwriter mimic an author's established voice for future books in the same series or brand. Read the provided excerpt and respond with ONLY valid JSON in this exact format, no markdown, no commentary:
{"tone":"string (1-2 sentences)","voice":"string (1-2 sentences, point of view, narrative distance)","pacing":"string (1-2 sentences)","vocabulary":"string (1-2 sentences, word choice, register)","themes":["string", ...3-6 recurring themes/motifs],"styleNotes":"string (2-4 sentences of concrete guidance for matching this voice)"}`;
  const userPrompt = `Excerpt:\n\n${excerpt}`;
  return { systemPrompt, userPrompt };
}

export interface StyleProfileSummary {
  tone?: string;
  voice?: string;
  pacing?: string;
  vocabulary?: string;
  themes?: string[];
  styleNotes?: string;
}

/**
 * Renders a StyleProfile's extracted summary as a "Series/Brand Style Guide"
 * block to prepend to a system prompt, so generation adopts the established
 * voice. Returns `null` if `summary` doesn't look like a style summary.
 */
export function buildStyleGuideBlock(summary: unknown): string | null {
  if (!summary || typeof summary !== 'object') return null;
  const s = summary as StyleProfileSummary;
  const lines = [
    s.tone && `Tone: ${s.tone}`,
    s.voice && `Voice: ${s.voice}`,
    s.pacing && `Pacing: ${s.pacing}`,
    s.vocabulary && `Vocabulary: ${s.vocabulary}`,
    Array.isArray(s.themes) && s.themes.length ? `Recurring themes: ${s.themes.join(', ')}` : null,
    s.styleNotes && `Style notes: ${s.styleNotes}`,
  ].filter(Boolean);
  if (!lines.length) return null;
  return `Series/Brand Style Guide — match this established voice:\n${lines.join('\n')}`;
}

export interface KdpMetadataInput {
  bookTitle?: string;
  bookGenre?: string;
  /** Manuscript excerpt for context. */
  context?: string;
  /** Author notes / extra instructions. */
  prompt?: string;
  /** Genre-filtered slice of BISAC_CATEGORIES the model must choose from. */
  categoryOptions?: BisacCategory[];
}

/**
 * Prompt for the `kdp-metadata` AI mode: generates a back-cover description,
 * 7 keywords, and up to 3 BISAC categories chosen from a provided list — the
 * three pieces of metadata Amazon KDP requires at publish time.
 */
export function buildKdpMetadataPrompt(input: KdpMetadataInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert Amazon KDP publishing assistant helping an author prepare their book for publication. Respond with ONLY valid JSON in this exact format, no markdown, no commentary:
{"description":"string (back-cover/product description, ~200-500 words, written to sell the book)","keywords":["string", ... exactly 7 search keywords/phrases readers would use to find this book],"categories":[{"code":"string","label":"string"}, ... up to 3, chosen ONLY from the provided category list, picking the best fits]}`;

  const bookCtx = [
    input.bookTitle && `Title: "${input.bookTitle}"`,
    input.bookGenre && `Genre: ${input.bookGenre}`,
  ]
    .filter(Boolean)
    .join('\n');

  const categoryList = input.categoryOptions?.length
    ? `Available categories (choose only from this list):\n${input.categoryOptions
        .map((c) => `${c.code} — ${c.label}`)
        .join('\n')}`
    : undefined;

  const userPrompt = [
    bookCtx || undefined,
    input.context ? `Manuscript excerpt:\n\n${input.context}` : undefined,
    input.prompt ? `Author's notes: ${input.prompt}` : undefined,
    categoryList,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { systemPrompt, userPrompt };
}
