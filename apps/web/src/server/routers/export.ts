import { z } from 'zod';
import { enqueue, JobName } from '@liberscript/jobs';
import { presignDownload } from '@liberscript/storage';
import type { ExportFormat } from '@liberscript/db';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';

const EXPORT_FORMATS = ['EPUB', 'DOCX', 'COVER_PDF', 'PRINT_PDF'] as const;

export const exportRouter = router({
  /** Queue an export; the worker builds the file and stores it. */
  create: protectedProcedure
    .input(z.object({ projectId: z.string(), format: z.enum(EXPORT_FORMATS) }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId);
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
