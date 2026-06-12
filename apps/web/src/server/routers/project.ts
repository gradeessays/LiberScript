import { z } from 'zod';
import { slugify, createId, MemberRole, planLimitExceeded } from '@liberscript/core';
import { protectedProcedure, router } from '../trpc';
import { currentOwner, requireCreateAccess, requireProjectAccess } from '../lib/ownership';
import { resolvePlanLimits } from '../lib/plan';

export const projectRouter = router({
  /** Projects in the caller's current workspace (personal or active team). */
  list: protectedProcedure.query(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    return ctx.prisma.project.findMany({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        manuscript: { select: { wordCount: true, readingMinutes: true, sourceFormat: true } },
      },
    });
  }),

  /** A single project with its chapters and stats. */
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    await requireProjectAccess(ctx, input.id);
    const project = await ctx.prisma.project.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        manuscript: {
          include: {
            chapters: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                kind: true,
                title: true,
                subtitle: true,
                order: true,
                wordCount: true,
              },
            },
          },
        },
      },
    });
    return project;
  }),

  /** Create a project in the current workspace (team requires editor+). */
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const owner = await requireCreateAccess(ctx);
      const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);
      if (limits.projects !== null) {
        const count = await ctx.prisma.project.count({
          where: { ownerType: owner.ownerType, ownerId: owner.ownerId, archivedAt: null },
        });
        if (count >= limits.projects) {
          throw planLimitExceeded('Choose a plan to start creating your books.', {
            limit: limits.projects,
            current: count,
          });
        }
      }
      const slug = `${slugify(input.title) || 'book'}-${createId('x').slice(2, 8)}`;
      return ctx.prisma.project.create({
        data: {
          title: input.title,
          slug,
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          createdById: ctx.user.id,
        },
      });
    }),

  /** Rename a project title. */
  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.id, MemberRole.EDITOR);
      await ctx.prisma.project.update({
        where: { id: input.id },
        data: { title: input.title },
      });
      return { ok: true };
    }),

  /** All unique author names and publisher names across the workspace — for autocomplete. */
  authorSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    const projects = await ctx.prisma.project.findMany({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId, archivedAt: null },
      select: { formatting: true },
    });
    const authors = new Set<string>();
    const publishers = new Set<string>();
    for (const p of projects) {
      const fmt = (p.formatting ?? {}) as { author?: string; publisherName?: string };
      if (fmt.author?.trim()) authors.add(fmt.author.trim());
      if (fmt.publisherName?.trim()) publishers.add(fmt.publisherName.trim());
    }
    return { authors: [...authors], publishers: [...publishers] };
  }),

  /** Archive (soft-delete) a project; team projects require admin+. */
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.id, MemberRole.ADMIN);
      await ctx.prisma.project.update({
        where: { id: input.id },
        data: { archivedAt: new Date() },
      });
      return { ok: true };
    }),
});
