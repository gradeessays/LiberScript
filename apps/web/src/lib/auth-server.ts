import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@liberscript/auth';

/**
 * Resolve the current session in a Server Component / route. Returns null on
 * any failure (e.g. a transient DB outage) so callers degrade to the signed-out
 * path instead of crashing the page with a 500.
 */
export async function getServerSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.error('[auth] getSession failed:', error);
    return null;
  }
}
