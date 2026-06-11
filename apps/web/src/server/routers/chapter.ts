import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  MemberRole,
  tiptapText,
  countWords,
  ChapterKind,
  KIND_LABELS,
  groupOfKind,
  type TiptapDoc,
} from '@liberscript/core';
import {
  applyChapterOrder,
  withDbRetry,
  type ChapterKind as PrismaChapterKind,
  type Prisma,
  type PrismaClient,
} from '@liberscript/db';
import { protectedProcedure, router } from '../trpc';
import { requireChapterAccess, requireProjectAccess } from '../lib/ownership';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };
const GROUP_RANK: Record<string, number> = { front: 0, body: 1, back: 2 };

/** Place every element at the end of its section group (front → body → back). */
async function regroupOrder(tx: Prisma.TransactionClient, manuscriptId: string) {
  const chapters = await tx.chapter.findMany({
    where: { manuscriptId },
    orderBy: { order: 'asc' },
    select: { id: true, kind: true },
  });
  // Stable sort by group keeps the existing within-group order.
  const sorted = [...chapters].sort(
    (a, b) => (GROUP_RANK[groupOfKind(a.kind)] ?? 1) - (GROUP_RANK[groupOfKind(b.kind)] ?? 1),
  );
  await applyChapterOrder(tx, manuscriptId, sorted.map((c) => c.id));
}

/** TipTap doc — validated loosely (a JSON object); the editor owns the shape. */
const tiptapDoc = z.record(z.any());

function docWordCount(content: unknown, title: string, subtitle?: string | null): number {
  const text = tiptapText(content as TiptapDoc);
  return countWords(`${title} ${subtitle ?? ''} ${text}`);
}

/**
 * Bump the project's updatedAt so "most recently edited" ordering (dashboard
 * landing, project switcher) reflects chapter edits, not just project renames.
 */
async function touchProject(db: Prisma.TransactionClient | PrismaClient, projectId: string) {
  await db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
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
  await applyChapterOrder(tx, manuscriptId, chapters.map((c) => c.id));
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
        await touchProject(tx, chapter.manuscript.projectId);
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
      const chapter = await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      await ctx.prisma.chapter.update({
        where: { id: input.id },
        data: { title: input.title, subtitle: input.subtitle ?? null },
      });
      await touchProject(ctx.prisma, chapter.manuscript.projectId);
      return { ok: true };
    }),

  /** Add a typed element (chapter or front/back-matter), placed in its group. */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        kind: z.nativeEnum(ChapterKind).default(ChapterKind.CHAPTER),
        title: z.string().min(1).max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      const title =
        input.title ??
        (input.kind === ChapterKind.CHAPTER ? 'New chapter' : KIND_LABELS[input.kind]);
      const defaultData =
        input.kind === ChapterKind.COPYRIGHT ? { genre: 'fiction' } : undefined;

      // Retry the whole write on transient connectivity (e.g. a Neon cold-start),
      // which would otherwise 500 and leave the optimistic element to roll back.
      return withDbRetry(async () => {
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
        return ctx.prisma.$transaction(
          async (tx) => {
            const chapter = await tx.chapter.create({
              data: {
                manuscriptId: manuscript.id,
                kind: input.kind as PrismaChapterKind,
                title,
                order: (last?.order ?? -1) + 1,
                content: EMPTY_DOC,
                ...(defaultData ? { data: defaultData } : {}),
              },
            });
            await regroupOrder(tx, manuscript.id);
            await touchProject(tx, input.projectId);
            return chapter;
          },
          { timeout: 15000, maxWait: 10000 },
        );
      });
    }),

  /** Re-classify an element (override auto-detection); regroups front→body→back. */
  updateKind: protectedProcedure
    .input(z.object({ id: z.string(), kind: z.nativeEnum(ChapterKind) }))
    .mutation(async ({ ctx, input }) => {
      const chapter = await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      await withDbRetry(() =>
        ctx.prisma.$transaction(
          async (tx) => {
            await tx.chapter.update({
              where: { id: input.id },
              data: { kind: input.kind as PrismaChapterKind },
            });
            await regroupOrder(tx, chapter.manuscript.id);
            await touchProject(tx, chapter.manuscript.projectId);
          },
          { timeout: 15000, maxWait: 10000 },
        ),
      );
      return { ok: true };
    }),

  /** Update structured data for form-based elements (title page, copyright). */
  updateData: protectedProcedure
    .input(z.object({ id: z.string(), data: z.record(z.any()).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const chapter = await requireChapterAccess(ctx, input.id, MemberRole.EDITOR);
      await ctx.prisma.chapter.update({
        where: { id: input.id },
        data: { data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined },
      });
      await touchProject(ctx.prisma, chapter.manuscript.projectId);
      return { ok: true };
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
        await touchProject(tx, chapter.manuscript.projectId);
      });
      return { ok: true };
    }),

  /** Reorder chapters within a manuscript (drag/drop or up/down). */
  reorder: protectedProcedure
    .input(z.object({ projectId: z.string(), orderedIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      await withDbRetry(() =>
        ctx.prisma.$transaction(
          async (tx) => {
            const ms = await tx.manuscript.findUnique({
              where: { projectId: input.projectId },
              select: { id: true },
            });
            if (ms) await applyChapterOrder(tx, ms.id, input.orderedIds);
          },
          { timeout: 15000, maxWait: 10000 },
        ),
      );
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

  /**
   * Bulk-create chapters from an AI-generated outline. Creates the manuscript
   * if it doesn't exist, then appends one CHAPTER per outline entry in order.
   */
  createFromOutline: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        chapters: z.array(z.object({ title: z.string().min(1).max(300) })).min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      return withDbRetry(async () => {
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
        let nextOrder = (last?.order ?? -1) + 1;
        const created = await ctx.prisma.$transaction(
          async (tx) => {
            const results = [];
            for (const ch of input.chapters) {
              results.push(
                await tx.chapter.create({
                  data: {
                    manuscriptId: manuscript.id,
                    kind: 'CHAPTER' as PrismaChapterKind,
                    title: ch.title,
                    order: nextOrder++,
                    content: EMPTY_DOC,
                  },
                }),
              );
            }
            await regroupOrder(tx, manuscript.id);
            await touchProject(tx, input.projectId);
            return results;
          },
          { timeout: 30000, maxWait: 15000 },
        );
        return { count: created.length, firstId: created[0]?.id };
      });
    }),
});
