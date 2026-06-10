/**
 * Deterministic manuscript critique (the AutoCrit-style pillar): pure-function
 * NLP heuristics over plain chapter text. No AI required — fast enough to run
 * synchronously on a full book, and the same engine can later seed AI-enhanced
 * passes.
 */

export type CritiqueCategory =
  | 'adverbs'
  | 'passive'
  | 'filler'
  | 'cliche'
  | 'repetition'
  | 'long-sentence'
  | 'telling'
  | 'pacing';

export type Severity = 'info' | 'warn' | 'high';

export interface CritiqueExample {
  chapter: string;
  text: string;
}

export interface CritiqueFinding {
  category: CritiqueCategory;
  label: string;
  severity: Severity;
  count: number;
  /** Occurrences per 1,000 words (comparable across book sizes). */
  per1k: number;
  guidance: string;
  examples: CritiqueExample[];
}

export interface ChapterCritique {
  id: string;
  title: string;
  wordCount: number;
  sentenceCount: number;
  avgSentenceLen: number;
  dialogueRatio: number;
  readingEase: number;
  issueCount: number;
}

export interface BookCritique {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLen: number;
  sentenceStdDev: number;
  /** Flesch Reading Ease, 0–100 (higher = easier). */
  readingEase: number;
  /** Flesch–Kincaid grade level. */
  gradeLevel: number;
  /** Share of words inside quoted dialogue, 0–1. */
  dialogueRatio: number;
  /** Overall readiness score, 0–100. */
  score: number;
  findings: CritiqueFinding[];
  chapters: ChapterCritique[];
}

export interface CritiqueInputChapter {
  id: string;
  title: string;
  text: string;
}

const MAX_EXAMPLES = 4;

const FILLER_WORDS = new Set([
  'just', 'really', 'very', 'quite', 'rather', 'somewhat', 'perhaps', 'simply',
  'actually', 'basically', 'literally', 'definitely', 'certainly', 'probably',
  'almost', 'somehow', 'totally', 'completely', 'utterly', 'truly',
]);

const TELL_PATTERNS: RegExp[] = [
  /\b(?:he|she|they|i|we)\s+(?:felt|realized|noticed|saw that|knew that|wondered|thought about|decided)\b/gi,
  /\bbegan to\b/gi,
  /\bstarted to\b/gi,
];

const CLICHES = [
  'at the end of the day', 'in the nick of time', 'time will tell', 'a perfect storm',
  'against all odds', 'avoid like the plague', 'cold sweat', 'dead of night',
  'easier said than done', 'every fiber of', 'heart of gold', 'heart skipped a beat',
  'in the blink of an eye', 'last but not least', 'like a ton of bricks',
  'needle in a haystack', 'calm before the storm', 'plenty of fish in the sea',
  'crystal clear', 'scared to death', 'sigh of relief', 'thick as thieves',
  'tip of the iceberg', 'without a doubt', 'all walks of life', 'beat around the bush',
  'better late than never', 'blessing in disguise', 'cut to the chase',
  'few and far between', 'fit as a fiddle', 'piece of cake', 'second nature',
  'set in stone', 'leave no stone unturned', 'light at the end of the tunnel',
];

const PASSIVE_RE =
  /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+(?:ed|en)|known|seen|taken|given|made|found|told|done|gone|shown|left|kept|held|brought|thought|caught|built|sent|heard|felt|put|set|won|lost)\b/gi;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with',
  'as', 'by', 'it', 'its', 'is', 'was', 'were', 'are', 'be', 'been', 'he', 'she',
  'they', 'them', 'his', 'her', 'their', 'i', 'we', 'you', 'your', 'my', 'me', 'us',
  'that', 'this', 'these', 'those', 'not', 'no', 'so', 'do', 'did', 'had', 'have',
  'has', 'him', 'from', 'up', 'down', 'out', 'into', 'over', 'all', 'one', 'what',
  'when', 'then', 'there', 'here', 'would', 'could', 'said',
]);

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

/** Split prose into sentences (good enough for stats, not linguistics-grade). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+(?=["'“”A-Z])|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** Heuristic syllable count: vowel groups, with silent-e adjustment. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^l]e|ed|es)$/, '');
  const groups = stripped.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

function snippet(sentence: string, max = 140): string {
  const t = sentence.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

interface Tally {
  count: number;
  examples: CritiqueExample[];
}

function tally(): Tally {
  return { count: 0, examples: [] };
}

function record(t: Tally, chapter: string, sentence: string, hits = 1) {
  t.count += hits;
  if (t.examples.length < MAX_EXAMPLES) t.examples.push({ chapter, text: snippet(sentence) });
}

/** Run the full critique over ordered narrative chapters. */
export function critiqueBook(chapters: CritiqueInputChapter[]): BookCritique {
  const adverbs = tally();
  const passive = tally();
  const filler = tally();
  const cliche = tally();
  const longSentence = tally();
  const telling = tally();
  const pacing = tally();

  const wordFreq = new Map<string, number>();
  const sentenceLengths: number[] = [];
  const chapterReports: ChapterCritique[] = [];

  let totalWords = 0;
  let totalSyllables = 0;
  let dialogueWords = 0;

  for (const ch of chapters) {
    const text = ch.text;
    const chWords = words(text);
    const sentences = splitSentences(text);
    let chIssues = 0;

    totalWords += chWords.length;
    for (const w of chWords) {
      totalSyllables += countSyllables(w);
      if (!STOPWORDS.has(w) && w.length > 3) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
    }

    // Dialogue share: words inside straight or curly double quotes.
    for (const m of text.match(/["“][^"“”]{2,}["”]/g) ?? []) {
      dialogueWords += words(m).length;
    }

    let chDialogue = 0;
    for (const m of text.match(/["“][^"“”]{2,}["”]/g) ?? []) chDialogue += words(m).length;

    for (const sentence of sentences) {
      const sw = words(sentence);
      sentenceLengths.push(sw.length);

      const adv = sw.filter((w) => w.endsWith('ly') && w.length > 4 && !/(?:only|early|family|likely|reply|supply|apply|belly|silly|holy|ugly|fly|ally)$/.test(w));
      if (adv.length > 0) {
        record(adverbs, ch.title, sentence, adv.length);
        chIssues += adv.length;
      }

      const pas = sentence.match(PASSIVE_RE);
      if (pas && pas.length > 0) {
        record(passive, ch.title, sentence, pas.length);
        chIssues += pas.length;
      }

      const fil = sw.filter((w) => FILLER_WORDS.has(w));
      if (fil.length > 0) {
        record(filler, ch.title, sentence, fil.length);
        chIssues += fil.length;
      }

      if (sw.length > 40) {
        record(longSentence, ch.title, sentence);
        chIssues += 1;
      }

      for (const re of TELL_PATTERNS) {
        re.lastIndex = 0;
        const hits = sentence.match(re);
        if (hits) {
          record(telling, ch.title, sentence, hits.length);
          chIssues += hits.length;
        }
      }

      if (/\bsuddenly\b/i.test(sentence)) {
        record(pacing, ch.title, sentence);
        chIssues += 1;
      }
    }

    const lower = text.toLowerCase();
    for (const phrase of CLICHES) {
      let idx = lower.indexOf(phrase);
      while (idx !== -1) {
        const start = Math.max(0, idx - 40);
        record(cliche, ch.title, `…${text.slice(start, idx + phrase.length + 40)}…`);
        chIssues += 1;
        idx = lower.indexOf(phrase, idx + phrase.length);
      }
    }

    const chSentLens = sentences.map((s) => words(s).length);
    const chAvg = chSentLens.length ? chSentLens.reduce((a, b) => a + b, 0) / chSentLens.length : 0;
    const chSyll = chWords.reduce((a, w) => a + countSyllables(w), 0);
    const chEase =
      chWords.length && sentences.length
        ? 206.835 - 1.015 * (chWords.length / sentences.length) - 84.6 * (chSyll / chWords.length)
        : 0;

    chapterReports.push({
      id: ch.id,
      title: ch.title,
      wordCount: chWords.length,
      sentenceCount: sentences.length,
      avgSentenceLen: round(chAvg),
      dialogueRatio: chWords.length ? round(chDialogue / chWords.length, 2) : 0,
      readingEase: round(Math.max(0, Math.min(100, chEase))),
      issueCount: chIssues,
    });
  }

  // Repetition: non-stopwords used conspicuously often (≥ 4×/1k words, min 8).
  const repetition = tally();
  const repeated = [...wordFreq.entries()]
    .filter(([, n]) => n >= Math.max(8, (totalWords / 1000) * 4))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  for (const [word, n] of repeated) {
    repetition.count += n;
    if (repetition.examples.length < MAX_EXAMPLES + 4) {
      repetition.examples.push({ chapter: '', text: `“${word}” appears ${n}×` });
    }
  }

  const sentenceCount = sentenceLengths.length;
  const avg = sentenceCount ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceCount : 0;
  const variance = sentenceCount
    ? sentenceLengths.reduce((a, b) => a + (b - avg) ** 2, 0) / sentenceCount
    : 0;
  const stdDev = Math.sqrt(variance);

  const ease = totalWords && sentenceCount
    ? 206.835 - 1.015 * (totalWords / sentenceCount) - 84.6 * (totalSyllables / totalWords)
    : 0;
  const grade = totalWords && sentenceCount
    ? 0.39 * (totalWords / sentenceCount) + 11.8 * (totalSyllables / totalWords) - 15.59
    : 0;

  const per1k = (n: number) => (totalWords ? round((n / totalWords) * 1000) : 0);
  const sev = (rate: number, warnAt: number, highAt: number): Severity =>
    rate >= highAt ? 'high' : rate >= warnAt ? 'warn' : 'info';

  const findings: CritiqueFinding[] = [
    {
      category: 'adverbs', label: '-ly adverbs', count: adverbs.count, per1k: per1k(adverbs.count),
      severity: sev(per1k(adverbs.count), 12, 25),
      guidance: 'Swap weak verb + adverb pairs for one strong verb (“ran quickly” → “sprinted”).',
      examples: adverbs.examples,
    },
    {
      category: 'passive', label: 'Passive voice', count: passive.count, per1k: per1k(passive.count),
      severity: sev(per1k(passive.count), 8, 18),
      guidance: 'Prefer active constructions — name who acts (“the door was opened” → “Mara opened the door”).',
      examples: passive.examples,
    },
    {
      category: 'filler', label: 'Filler words', count: filler.count, per1k: per1k(filler.count),
      severity: sev(per1k(filler.count), 10, 22),
      guidance: 'Words like “just”, “really”, “very” dilute prose. Cut them unless they carry meaning.',
      examples: filler.examples,
    },
    {
      category: 'cliche', label: 'Clichés', count: cliche.count, per1k: per1k(cliche.count),
      severity: cliche.count === 0 ? 'info' : cliche.count > 8 ? 'high' : 'warn',
      guidance: 'Replace stock phrases with a fresh image in your own voice.',
      examples: cliche.examples,
    },
    {
      category: 'repetition', label: 'Repeated words', count: repeated.length, per1k: per1k(repeated.length),
      severity: repeated.length === 0 ? 'info' : repeated.length > 6 ? 'high' : 'warn',
      guidance: 'These words appear unusually often — vary them or check for echo on the page.',
      examples: repetition.examples,
    },
    {
      category: 'long-sentence', label: 'Very long sentences (40+ words)', count: longSentence.count,
      per1k: per1k(longSentence.count),
      severity: sev(per1k(longSentence.count), 3, 8),
      guidance: 'Break marathon sentences up; readers lose the thread past ~40 words.',
      examples: longSentence.examples,
    },
    {
      category: 'telling', label: 'Telling, not showing', count: telling.count, per1k: per1k(telling.count),
      severity: sev(per1k(telling.count), 5, 12),
      guidance: '“She felt afraid” tells. Show the trembling hands and the held breath instead.',
      examples: telling.examples,
    },
    {
      category: 'pacing', label: '“Suddenly” crutches', count: pacing.count, per1k: per1k(pacing.count),
      severity: sev(per1k(pacing.count), 1.5, 4),
      guidance: 'Surprise lands harder without announcing it — cut “suddenly” and let the action jolt.',
      examples: pacing.examples,
    },
  ];

  // Readiness score: start at 100, subtract weighted overages.
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'warn') score -= 4;
    if (f.severity === 'high') score -= 9;
  }
  if (stdDev < 4 && avg > 10 && sentenceCount > 50) score -= 5; // monotone rhythm
  if (ease < 50 && totalWords > 0) score -= 5; // very dense prose
  score = Math.max(0, Math.min(100, score));

  return {
    wordCount: totalWords,
    sentenceCount,
    avgSentenceLen: round(avg),
    sentenceStdDev: round(stdDev),
    readingEase: round(Math.max(0, Math.min(100, ease))),
    gradeLevel: round(Math.max(0, grade)),
    dialogueRatio: totalWords ? round(dialogueWords / totalWords, 2) : 0,
    score,
    findings,
    chapters: chapterReports,
  };
}
