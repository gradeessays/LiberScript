import { Redis } from 'ioredis';
import { getServerEnv } from '@liberscript/core';

let connection: Redis | undefined;

/**
 * Shared ioredis connection for BullMQ. `maxRetriesPerRequest: null` is
 * required by BullMQ workers/blocking commands.
 */
export function getRedisConnection(): Redis {
  if (!connection) {
    const { REDIS_URL } = getServerEnv();
    connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}
