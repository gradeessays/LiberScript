import { z } from 'zod';
import { createId, MemberRole } from '@liberscript/core';
import { presignDownload, presignUpload } from '@liberscript/storage';
import type { Prisma } from '@liberscript/db';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';

interface CoverData {
  frontImageStorageKey?: string;
  dominantColor?: string;
  spineColor?: string;
  textColor?: string;
  backText?: string;
  paper?: 'white' | 'cream' | 'color';
  pageCount?: number;
  trimKey?: string;
  customTrim?: { widthIn: number; heightIn: number };
}

export const coverRouter = router({
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId);
      const project = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
        select: { title: true, cover: true, formatting: true },
      });
      const cover = (project.cover ?? {}) as CoverData;
      const author = (project.formatting as { author?: string } | null)?.author;
      const frontImageUrl = cover.frontImageStorageKey
        ? await presignDownload({ key: cover.frontImageStorageKey, fileName: 'cover' })
        : undefined;
      return { title: project.title, author, cover, frontImageUrl };
    }),

  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        cover: z.record(z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      const current = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
        select: { cover: true },
      });
      const merged = { ...((current.cover ?? {}) as CoverData), ...input.cover };
      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { cover: merged as Prisma.InputJsonValue },
      });
      return { ok: true };
    }),

  frontUploadUrl: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        contentType: z.string().regex(/^image\//, 'Must be an image'),
        ext: z.string().regex(/^[a-z0-9]{2,5}$/i),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      const key = `${project.ownerType.toLowerCase()}/${project.ownerId}/projects/${project.id}/cover-${createId('x').slice(2, 10)}.${input.ext.toLowerCase()}`;
      const uploadUrl = await presignUpload({ key, contentType: input.contentType });
      return { uploadUrl, storageKey: key };
    }),
});
