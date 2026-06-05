import { auth } from '@liberscript/auth';
import { prisma } from '@liberscript/db';

/**
 * Per-request tRPC context. Resolves the better-auth session (if any) so
 * procedures can authenticate and authorize. `activeOrganizationId` reflects
 * the team the user is currently acting within (set via the org switcher).
 */
export async function createContext(opts: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: opts.headers });

  return {
    prisma,
    headers: opts.headers,
    session: session?.session ?? null,
    user: session?.user ?? null,
    activeOrganizationId: session?.session.activeOrganizationId ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
