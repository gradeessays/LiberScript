import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@liberscript/auth';

/** Resolve the current session in a Server Component / route. */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}
