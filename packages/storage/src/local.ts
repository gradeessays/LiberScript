import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { getServerEnv } from '@liberscript/core';
import type { PresignDownloadInput, PresignUploadInput, StorageDriver } from './types';

/** Base directory for stored objects (shared by web + worker on one machine). */
function baseDir(): string {
  const env = getServerEnv();
  return env.STORAGE_LOCAL_DIR ?? resolve(process.cwd(), '../../.data/uploads');
}

/** Resolve a storage key to an absolute path, rejecting path traversal. */
function pathForKey(key: string): string {
  if (key.includes('..') || isAbsolute(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return join(baseDir(), key);
}

function sign(key: string, exp: number): string {
  const secret = getServerEnv().AUTH_SECRET;
  return createHmac('sha256', secret).update(`${key}:${exp}`).digest('hex');
}

/** Verify a local-storage access token from the upload/download route. */
export function verifyStorageToken(key: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(key, exp);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signedUrl(key: string, expiresIn: number, name?: string): string {
  const env = getServerEnv();
  const exp = Date.now() + expiresIn * 1000;
  const params = new URLSearchParams({ key, exp: String(exp), sig: sign(key, exp) });
  if (name) params.set('name', name);
  return `${env.APP_URL}/api/storage/object?${params.toString()}`;
}

export const localDriver: StorageDriver = {
  presignUpload(input: PresignUploadInput) {
    return Promise.resolve(signedUrl(input.key, input.expiresIn ?? 600));
  },

  presignDownload(input: PresignDownloadInput) {
    return Promise.resolve(signedUrl(input.key, input.expiresIn ?? 600, input.fileName));
  },

  getObjectBuffer(key: string) {
    return readFile(pathForKey(key));
  },

  async putObjectBuffer(key: string, body: Buffer) {
    const path = pathForKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  },

  async deleteObject(key: string) {
    await rm(pathForKey(key), { force: true });
  },
};
