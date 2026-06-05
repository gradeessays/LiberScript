import { z } from 'zod';
import { createId, MemberRole } from '@liberscript/core';
import { presignDownload, presignUpload } from '@liberscript/storage';
import type { Prisma } from '@liberscript/db';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';
import { resolvePlanLimits } from '../lib/plan';

interface Formatting {
  publisherName?: string;
  author?: string;
  logoStorageKey?: string;
  typography?: Record<string, unknown>;
}

export const formattingRouter = router({
  /** Everything the live preview needs: theme, meta, chapters, watermark flag. */
  previewData: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await requireProjectAccess(ctx, input.projectId);
      const [full, metadata] = await Promise.all([
        ctx.prisma.project.findUniqueOrThrow({
          where: { id: input.projectId },
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
                    content: true,
                    data: true,
                  },
                },
              },
            },
          },
        }),
        ctx.prisma.metadata.findUnique({ where: { projectId: input.projectId } }),
      ]);

      const fmt = (full.formatting ?? {}) as Formatting;
      const limits = await resolvePlanLimits(ctx.prisma, project.ownerType, project.ownerId);
      const logoUrl = fmt.logoStorageKey
        ? await presignDownload({ key: fmt.logoStorageKey, fileName: 'logo' })
        : undefined;

      return {
        themeKey: full.themeKey,
        watermark: !limits.removeWatermark,
        canRemoveWatermark: limits.removeWatermark,
        canUseCustomFonts: limits.customFonts,
        canUsePremiumThemes: limits.premiumThemes,
        meta: {
          title: full.title,
          author: metadata?.authorName ?? fmt.author,
          publisherName: fmt.publisherName,
          logoUrl,
        },
        typography: (fmt.typography ?? null) as Record<string, unknown> | null,
        elements: (full.manuscript?.chapters ?? []).map((c) => ({
          kind: c.kind,
          title: c.title,
          subtitle: c.subtitle,
          data: c.data as Record<string, unknown> | null,
          content: c.content,
        })),
      };
    }),

  /** Persist the chosen theme and publisher/author/logo overrides. */
  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        themeKey: z.string().max(60).optional(),
        publisherName: z.string().max(160).nullish(),
        author: z.string().max(160).nullish(),
        logoStorageKey: z.string().max(400).nullish(),
        typography: z.record(z.any()).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      const current = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
        select: { formatting: true },
      });
      const fmt = { ...((current.formatting ?? {}) as Formatting) };
      if (input.publisherName !== undefined) fmt.publisherName = input.publisherName ?? undefined;
      if (input.author !== undefined) fmt.author = input.author ?? undefined;
      if (input.logoStorageKey !== undefined) fmt.logoStorageKey = input.logoStorageKey ?? undefined;
      if (input.typography !== undefined) fmt.typography = input.typography ?? undefined;

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: {
          ...(input.themeKey ? { themeKey: input.themeKey } : {}),
          formatting: fmt as Prisma.InputJsonValue,
        },
      });
      return { ok: true };
    }),

  /** Presigned URL to upload a publisher/imprint logo for the title page. */
  logoUploadUrl: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        contentType: z.string().regex(/^image\//, 'Must be an image'),
        ext: z.string().regex(/^[a-z0-9]{2,5}$/i),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);
      const key = `${project.ownerType.toLowerCase()}/${project.ownerId}/projects/${project.id}/logo-${createId('x').slice(2, 10)}.${input.ext.toLowerCase()}`;
      const uploadUrl = await presignUpload({ key, contentType: input.contentType });
      return { uploadUrl, storageKey: key };
    }),
});
