import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Liveness probe — process is up. */
export function GET() {
  return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
}
