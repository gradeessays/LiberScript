import { pingPayload } from '@liberscript/jobs';
import { logger } from '../logger';

/** Phase 0 smoke-test handler: validates and logs the ping payload. */
export async function handlePing(data: unknown): Promise<{ echoed: string }> {
  const { message, at } = pingPayload.parse(data);
  logger.info({ message, at }, 'ping received');
  return { echoed: message };
}
