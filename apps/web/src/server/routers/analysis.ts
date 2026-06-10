import { z } from 'zod';
import { critiqueBook } from '@liberscript/analysis';
import { ChapterKind, tiptapText, type TiptapDoc } from '@liberscript/core';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';

/** Sections whose prose participates in the critique (skip TOC, copyright…). */
const NARRATIVE_KINDS: ChapterKind[] = [
  ChapterKind.FOREWORD,
  ChapterKind.PREFACE,
  ChapterKind.PROLOGUE,
  ChapterKind.INTRODUCTION,
  ChapterKind.CHAPTER,
  ChapterKind.EPILOGUE,
  ChapterKind.AFTERWORD,
];

export const analysisRouter = router({
  /**
   * Deterministic manuscript critique over the book's narrative sections.
   * Pure-function NLP — fast enough to run synchronously on a full novel.
   */
  critique: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId);
      const manuscript = await ctx.prisma.manuscript.findUnique({
        where: { projectId: input.projectId },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            select: { id: true, kind: true, title: true, content: true },
          },
        },
      });
      const chapters = (manuscript?.chapters ?? [])
        .filter((c) => NARRATIVE_KINDS.includes(c.kind as ChapterKind))
        .map((c) => ({
          id: c.id,
          title: c.title,
          text: tiptapText(c.content as unknown as TiptapDoc),
        }));
      return critiqueBook(chapters);
    }),
});
