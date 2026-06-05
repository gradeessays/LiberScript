import { z } from 'zod';
import { enqueue, getRedisConnection, JobName } from '@liberscript/jobs';
import { publicProcedure, router } from '../trpc';

export const healthRouter = router({
  /** Liveness + dependency checks (DB and Redis). */
  status: publicProcedure.query(async ({ ctx }) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      const pong = await getRedisConnection().ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((c) => c === 'ok');
    return { healthy, checks, time: new Date().toISOString() };
  }),

  /** Enqueue a ping job for the worker to drain (Phase 0 smoke test). */
  ping: publicProcedure
    .input(z.object({ message: z.string().min(1).max(200).default('ping') }))
    .mutation(async ({ input }) => {
      const jobId = await enqueue(JobName.PING, {
        message: input.message,
        at: new Date().toISOString(),
      });
      return { jobId };
    }),
});
