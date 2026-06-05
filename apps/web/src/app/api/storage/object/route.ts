import { NextResponse } from 'next/server';
import { getServerEnv } from '@liberscript/core';
import { getObjectBuffer, putObjectBuffer, verifyStorageToken } from '@liberscript/storage';

// Local storage driver only: serves the signed upload (PUT) / download (GET)
// URLs that the local driver hands out. With STORAGE_DRIVER=s3 these go to S3
// directly and this route is unused.
export const runtime = 'nodejs';

function authorize(req: Request): { key: string; name: string | null } | null {
  if (getServerEnv().STORAGE_DRIVER !== 'local') return null;
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig');
  if (!key || !sig || !verifyStorageToken(key, exp, sig)) return null;
  return { key, name: url.searchParams.get('name') };
}

export async function PUT(req: Request) {
  const auth = authorize(req);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = Buffer.from(await req.arrayBuffer());
  await putObjectBuffer(auth.key, body, req.headers.get('content-type') ?? undefined);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const auth = authorize(req);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await getObjectBuffer(auth.key);
    const headers = new Headers({ 'Content-Type': 'application/octet-stream' });
    if (auth.name) headers.set('Content-Disposition', `attachment; filename="${auth.name}"`);
    return new NextResponse(new Uint8Array(body), { headers });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
