import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { MemberRole } from '@liberscript/core';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';

export const metadataRouter = router({
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId);
      return ctx.prisma.metadata.findUnique({ where: { projectId: input.projectId } });
    }),

  save: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        authorName: z.string().max(200).optional(),
        blurb: z.string().max(4000).optional(),
        keywords: z.array(z.string().max(50)).max(7).optional(),
        categories: z.array(z.string()).max(3).optional(),
        isbn: z.string().max(32).optional(),
        language: z.string().max(16).optional(),
        publisher: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      const { projectId, ...data } = input;
      return ctx.prisma.metadata.upsert({
        where: { projectId },
        create: { projectId, ...data },
        update: data,
      });
    }),

  /** Reference data for a publishing platform's metadata limits (e.g. "kdp"). */
  getPlatformProfile: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.platformProfile.findUnique({ where: { key: input.key } });
      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Platform profile "${input.key}" not found.` });
      }
      return profile;
    }),
});
