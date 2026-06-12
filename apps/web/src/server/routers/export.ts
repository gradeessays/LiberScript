import { z } from 'zod';
import { enqueue, JobName } from '@liberscript/jobs';
import { presignDownload } from '@liberscript/storage';
import type { ExportFormat } from '@liberscript/db';
import { ExportFormat as EF, FAIR_USE_EXPORTS_PER_DAY, planLimitExceeded } from '@liberscript/core';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';
import { resolvePlanLimits } from '../lib/plan';

const EXPORT_FORMATS = ['EPUB', 'DOCX', 'COVER_PDF', 'PRINT_PDF'] as const;

// Map our worker format strings to the core ExportFormat enum for plan gate checks.
const FORMAT_TO_CORE: Record<string, EF | null> = {
  EPUB: EF.EPUB,
  DOCX: EF.DOCX,
  COVER_PDF: null,  // always allowed (cover-only, no prose content)
  PRINT_PDF: EF.PDF,
};

export const exportRouter = router({
  /** Queue an export; the worker builds the file and stores it. */
  create: protectedProcedure
    .input(z.object({ projectId: z.string(), format: z.enum(EXPORT_FORMATS) }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireProjectAccess(ctx, input.projectId);
      const owner = { ownerType: project.ownerType, ownerId: project.ownerId };
      const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);

      const coreFormat = FORMAT_TO_CORE[input.format] ?? null;
      if (coreFormat !== null && limits.exportFormats !== null) {
        const allowed = limits.exportFormats;
        if (!allowed.includes(coreFormat)) {
          throw planLimitExceeded(
            `${input.format} export requires a Pro plan. Free plan supports: ${allowed.join(', ')}.`,
            { format: input.format, allowedFormats: allowed },
          );
        }
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await ctx.prisma.exportJob.count({
        where: { project: { ownerType: owner.ownerType, ownerId: owner.ownerId }, createdAt: { gte: since } },
      });
      if (recent >= FAIR_USE_EXPORTS_PER_DAY) {
        throw planLimitExceeded(`You've reached today's export limit (${FAIR_USE_EXPORTS_PER_DAY}). Try again tomorrow.`);
      }

      const job = await ctx.prisma.exportJob.create({
        data: { projectId: input.projectId, format: input.format as ExportFormat, status: 'QUEUED' },
      });
      await enqueue(JobName.GENERATE_EXPORT, { exportJobId: job.id, projectId: input.projectId });
      return { jobId: job.id };
    }),

  /** Recent export jobs for a project, with download URLs for finished ones. */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId);
      const jobs = await ctx.prisma.exportJob.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { artifact: true },
      });
      return Promise.all(
        jobs.map(async (j) => ({
          id: j.id,
          format: j.format,
          status: j.status,
          error: j.error,
          createdAt: j.createdAt,
          fileName: j.artifact?.fileName ?? null,
          sizeBytes: j.artifact?.sizeBytes ?? null,
          downloadUrl:
            j.status === 'SUCCEEDED' && j.artifact
              ? await presignDownload({ key: j.artifact.storageKey, fileName: j.artifact.fileName })
              : null,
        })),
      );
    }),
});
