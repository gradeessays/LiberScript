import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createId, detectFormat, MAX_UPLOAD_BYTES, MemberRole } from '@liberscript/core';
import { buildAssetKey, presignUpload } from '@liberscript/storage';
import { enqueue, JobName } from '@liberscript/jobs';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';

export const uploadRouter = router({
  /**
   * Reserve an Asset and return a presigned URL the browser PUTs the file to.
   * Uploading requires at least the editor role on team projects.
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1).max(120),
        sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProjectAccess(ctx, input.projectId, MemberRole.EDITOR);

      if (!detectFormat(input.fileName)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Unsupported file type. Use DOCX, EPUB, PDF, Markdown, or TXT.',
        });
      }

      const assetId = createId('asset');
      const storageKey = buildAssetKey({
        ownerType: project.ownerType,
        ownerId: project.ownerId,
        assetId,
        fileName: input.fileName,
      });

      await ctx.prisma.asset.create({
        data: {
          id: assetId,
          projectId: project.id,
          storageKey,
          fileName: input.fileName,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          uploaded: false,
          createdById: ctx.user.id,
        },
      });

      const uploadUrl = await presignUpload({ key: storageKey, contentType: input.contentType });
      return { assetId, uploadUrl };
    }),

  /** Confirm a completed upload and queue parsing into chapters. */
  confirm: protectedProcedure
    .input(z.object({ assetId: z.string(), mode: z.enum(['replace', 'append']).default('replace') }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.prisma.asset.findUnique({ where: { id: input.assetId } });
      if (!asset?.projectId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Upload not found.' });
      }
      await requireProjectAccess(ctx, asset.projectId, MemberRole.EDITOR);

      await ctx.prisma.asset.update({ where: { id: asset.id }, data: { uploaded: true } });
      const jobId = await enqueue(JobName.PARSE_MANUSCRIPT, {
        projectId: asset.projectId,
        assetId: asset.id,
        mode: input.mode,
      });
      return { ok: true, jobId };
    }),
});
