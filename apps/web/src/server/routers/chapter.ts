import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { MemberRole, tiptapText, countWords, type TiptapDoc } from '@liberscript/core';
import type { Prisma, PrismaClient } from '@liberscript/db';
import { protectedProcedure, router } from '../trpc';
import { requireChapterAccess, requireProjectAccess } from '../lib/ownership';

/** TipTap doc — validated loosely (a JSON object); the editor owns the shape. */
const tiptapDoc = z.record(z.any());

function docWordCount(content: unknown, title: string, subtitle?: string | null): number {
  const text = tiptapText(content as TiptapDoc);
  return countWords(`${title} ${subtitle ?? ''} ${text}`);
}

/** Recompute and persist the manuscript's aggregate stats from its chapters. */
async function recomputeManuscript(tx: Prisma.TransactionClient, manuscriptId: string) {
  const chapters = await tx.chapter.findMany({
    where: { manuscriptId },
    select: { wordCount: true },
  });
  const wordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  await tx.manuscript.update({
    where: { id: manuscriptId },
    data: { wordCount, readingMinutes: Math.max(1, Math.round(wordCount / 250)) },
  });
}

/** Re-number chapter `order` to be contiguous from 0 (by current order). */
async function reindex(tx: Prisma.TransactionClient, manuscriptId: string) {
  const chapters = await tx.chapter.findMany({
    where: { manuscriptId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  // Two-phase to avoid unique (manuscriptId, order) collisions.
  await Promise.all(
    chapters.map((c, i) =>
      tx.chapter.update({ where: { id: c.id }, data: { order: 1000 + i } }),
    ),
  );
  await Promise.all(
    chapters.map((c, i) => tx.chapter.update({ where: { id: c.id }, data: { order: i } })),
  );
}

export const chapterRouter = router({
  /** Full chapter content for the editor. */
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    await requireChapterAccess(ctx, input.id);
    return ctx.prisma.chapter.findUniqueOrThrow({ where: { id: input.id } });
  }),

  /** Autosave chapter body content. */
  updateContent: protectedProcedure
    .input(z.object({ id: z.string(), content: tiptapDoc }))
    .mutation(async ({ ctx, input }) => {
      const chapter = await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      await ctx.prisma.$transaction(async (tx) => {
        await tx.chapter.update({
          where: { id: input.id },
          data: {
            content: input.content as Prisma.InputJsonValue,
            wordCount: docWordCount(input.content, chapter.title, chapter.subtitle),
          },
        });
        await recomputeManuscript(tx, chapter.manuscript.id);
      });
      return { ok: true };
    }),

  /** Rename / re-subtitle a chapter (override of auto-detection). */
  updateMeta: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(300),
        subtitle: z.string().max(300).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      await ctx.prisma.chapter.update({
        where: { id: input.id },
        data: { title: input.title, subtitle: input.subtitle ?? null },
      });
      return { ok: true };
    }),

  /** Append a new empty chapter to a project's manuscript. */
  create: protectedProcedure
    .input(z.object({ projectId: z.string(), title: z.string().min(1).max(300).default('New chapter') }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      const manuscript = await ctx.prisma.manuscript.upsert({
        where: { projectId: input.projectId },
        create: { projectId: input.projectId },
        update: {},
      });
      const last = await ctx.prisma.chapter.findFirst({
        where: { manuscriptId: manuscript.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      return ctx.prisma.chapter.create({
        data: {
          manuscriptId: manuscript.id,
          title: input.title,
          order: (last?.order ?? -1) + 1,
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
        },
      });
    }),

  /** Delete a chapter and re-number the rest. */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const chapter = await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      await ctx.prisma.$transaction(async (tx) => {
        await tx.chapter.delete({ where: { id: input.id } });
        await reindex(tx, chapter.manuscript.id);
        await recomputeManuscript(tx, chapter.manuscript.id);
      });
      return { ok: true };
    }),

  /** Reorder chapters within a manuscript (drag/drop or up/down). */
  reorder: protectedProcedure
    .input(z.object({ projectId: z.string(), orderedIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      await ctx.prisma.$transaction(async (tx) => {
        // Offset first to avoid unique(order) collisions, then set final order.
        await Promise.all(
          input.orderedIds.map((id, i) =>
            tx.chapter.update({ where: { id }, data: { order: 1000 + i } }),
          ),
        );
        await Promise.all(
          input.orderedIds.map((id, i) => tx.chapter.update({ where: { id }, data: { order: i } })),
        );
      });
      return { ok: true };
    }),

  /**
   * Split a chapter into two at the editor's cursor: the caller supplies the
   * content for the original (before) and the new chapter (after).
   */
  split: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        before: tiptapDoc,
        after: tiptapDoc,
        newTitle: z.string().min(1).max(300).default('Untitled chapter'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const chapter = await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      return ctx.prisma.$transaction(async (tx) => {
        // Make room: shift chapters after this one down by one.
        await tx.chapter.updateMany({
          where: { manuscriptId: chapter.manuscript.id, order: { gt: chapter.order } },
          data: { order: { increment: 1 } },
        });
        await tx.chapter.update({
          where: { id: input.id },
          data: {
            content: input.before as Prisma.InputJsonValue,
            wordCount: docWordCount(input.before, chapter.title, chapter.subtitle),
          },
        });
        const created = await tx.chapter.create({
          data: {
            manuscriptId: chapter.manuscript.id,
            title: input.newTitle,
            order: chapter.order + 1,
            content: input.after as Prisma.InputJsonValue,
            wordCount: docWordCount(input.after, input.newTitle),
          },
        });
        await recomputeManuscript(tx, chapter.manuscript.id);
        return created;
      });
    }),

  /** Merge a chapter into the preceding one and delete it. */
  mergeUp: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const chapter = await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      const prisma = ctx.prisma as PrismaClient;
      const prev = await prisma.chapter.findFirst({
        where: { manuscriptId: chapter.manuscript.id, order: { lt: chapter.order } },
        orderBy: { order: 'desc' },
      });
      if (!prev) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No previous chapter to merge into.' });
      }
      const prevDoc = prev.content as unknown as TiptapDoc;
      const curDoc = chapter.content as unknown as TiptapDoc;
      const merged: TiptapDoc = {
        type: 'doc',
        content: [...(prevDoc.content ?? []), ...(curDoc.content ?? [])],
      };
      await prisma.$transaction(async (tx) => {
        await tx.chapter.update({
          where: { id: prev.id },
          data: {
            content: merged as unknown as Prisma.InputJsonValue,
            wordCount: docWordCount(merged, prev.title, prev.subtitle),
          },
        });
        await tx.chapter.delete({ where: { id: input.id } });
        await reindex(tx, chapter.manuscript.id);
        await recomputeManuscript(tx, chapter.manuscript.id);
      });
      return { ok: true, mergedIntoId: prev.id };
    }),
});
