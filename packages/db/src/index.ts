import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Build a connection URL tuned for Neon's serverless Postgres, which auto-suspends
 * when idle. Without a generous connect timeout, the first query after a suspend
 * can fail with P1001 ("Can't reach database server") before the compute wakes.
 */
function resilientUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has('connect_timeout')) u.searchParams.set('connect_timeout', '30');
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '30');
    return u.toString();
  } catch {
    return raw;
  }
}

/**
 * Prisma client singleton. In dev, Next.js/tsx hot-reload can re-evaluate
 * modules repeatedly; caching on `globalThis` avoids exhausting DB connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const dbUrl = resilientUrl(process.env.DATABASE_URL);

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Prisma error codes for transient connectivity issues (e.g. Neon waking up). */
const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

function isTransient(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const code = (err as { code?: string })?.code;
  if (code && TRANSIENT_CODES.has(code)) return true;
  const msg = String((err as { message?: string })?.message ?? '');
  return /can't reach database server|connection (closed|reset|timed out)|ECONNRESET|ETIMEDOUT/i.test(msg);
}

/**
 * Run a DB operation, retrying a few times on transient connectivity errors.
 * Use for writes/transactions where a Neon cold-start would otherwise 500. The
 * operation must be safe to re-run (the retried failures happen at connect time,
 * before any statement executes).
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/**
 * Renumber a manuscript's chapters to the given id order (0..n-1) in just two
 * SQL statements, instead of 2×N individual updates inside the transaction —
 * which blew past the 5s interactive-transaction timeout over a remote DB.
 *
 * Phase 1 offsets every row out of range so phase 2 (a single VALUES update to
 * the final contiguous orders) can't transiently collide with the unique
 * (manuscriptId, order) index. `orderedIds` must list ALL of the manuscript's
 * chapters.
 */
export async function applyChapterOrder(
  tx: Prisma.TransactionClient,
  manuscriptId: string,
  orderedIds: string[],
): Promise<void> {
  if (orderedIds.length === 0) return;
  await tx.$executeRaw(
    Prisma.sql`UPDATE "chapter" SET "order" = "order" + 1000000 WHERE "manuscriptId" = ${manuscriptId}`,
  );
  const values = Prisma.join(orderedIds.map((cid, i) => Prisma.sql`(${cid}::text, ${i}::int)`));
  await tx.$executeRaw(
    Prisma.sql`UPDATE "chapter" AS c SET "order" = v.ord FROM (VALUES ${values}) AS v(id, ord) WHERE c.id = v.id AND c."manuscriptId" = ${manuscriptId}`,
  );
}

export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
