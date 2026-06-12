import { Worker, type Job } from 'bullmq';
import { getQueue, getRedisConnection, JobName, QUEUE_NAME } from '@liberscript/jobs';
import { logger } from './logger';
import { handlePing } from './handlers/ping';
import { handleParseManuscript } from './handlers/parse-manuscript';
import { handleGenerateExport } from './handlers/generate-export';
import { handleCleanupExpired } from './handlers/cleanup-expired';

/**
 * The single Liberscript background worker. Routes each job by name to its
 * handler. New job types (analysis, AI) register here.
 */
async function processor(job: Job): Promise<unknown> {
  switch (job.name) {
    case JobName.PING:
      return handlePing(job.data);
    case JobName.PARSE_MANUSCRIPT:
      return handleParseManuscript(job.data);
    case JobName.GENERATE_EXPORT:
      return handleGenerateExport(job.data);
    case JobName.CLEANUP_EXPIRED:
      return handleCleanupExpired();
    default:
      throw new Error(`No handler registered for job "${job.name}"`);
  }
}

const worker = new Worker(QUEUE_NAME, processor, {
  connection: getRedisConnection(),
  concurrency: 5,
});

worker.on('completed', (job) => logger.info({ jobId: job.id, name: job.name }, 'job completed'));
worker.on('failed', (job, err) =>
  logger.error({ jobId: job?.id, name: job?.name, err: err.message }, 'job failed'),
);

logger.info(`Liberscript worker listening on queue "${QUEUE_NAME}"`);

/** Register recurring jobs (idempotent — BullMQ dedupes by jobId). */
async function scheduleRecurringJobs() {
  await getQueue().add(JobName.CLEANUP_EXPIRED, {}, { repeat: { pattern: '0 3 * * *' }, jobId: 'cleanup-expired-daily' });
}
void scheduleRecurringJobs().catch((err) => logger.error({ err }, 'failed to schedule recurring jobs'));

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down worker');
  await worker.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
