export * from './types';
export { computeStats } from './stats';
export {
  isChapterHeading,
  isSectionHeading,
  matchChapterHeading,
  classifyHeading,
  assembleSections,
  chapterText,
} from './chapters';
export { htmlToBlocks, textToBlocks } from './blocks';
export { htmlToText, splitHtmlByHeadings } from './html';
export { blocksToTiptap, textToTiptap } from './tiptap';
export { parseManuscript, chapterToDoc } from './parse';
export {
  critiqueBook,
  splitSentences,
  countSyllables,
  type BookCritique,
  type ChapterCritique,
  type CritiqueFinding,
  type CritiqueInputChapter,
  type CritiqueCategory,
  type Severity,
} from './critique';
// Re-exported from core so existing analysis consumers keep one import surface.
export { countWords, tiptapText, type TiptapDoc, type TiptapNode } from '@liberscript/core';
