import { Queue } from 'bullmq';
import { getRedisConnection } from './connection';
import { type JobName, type JobPayloadMap, jobPayloadSchemas } from './jobs';

/** Single queue for all Liberscript background work. */
export const QUEUE_NAME = 'liberscript';

let queue: Queue | undefined;

export function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  }
  return queue;
}

/**
 * Enqueue a job with a payload validated against its schema. Returns the
 * BullMQ job id. Used by the web app to hand work to the worker.
 */
export async function enqueue<K extends JobName>(
  name: K,
  payload: JobPayloadMap[K],
): Promise<string | undefined> {
  const schema = jobPayloadSchemas[name];
  const parsed = schema.parse(payload);
  const job = await getQueue().add(name, parsed, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });
  return job.id;
}
