import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton. In dev, Next.js/tsx hot-reload can re-evaluate
 * modules repeatedly; caching on `globalThis` avoids exhausting DB connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
