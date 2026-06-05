import { NextResponse } from 'next/server';
import { prisma } from '@liberscript/db';
import { getRedisConnection } from '@liberscript/jobs';

export const runtime = 'nodejs';

/** Readiness probe — dependencies (DB + Redis) are reachable. */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
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

  const ready = Object.values(checks).every((c) => c === 'ok');
  return NextResponse.json({ ready, checks }, { status: ready ? 200 : 503 });
}
