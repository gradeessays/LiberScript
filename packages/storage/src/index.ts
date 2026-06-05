import { getServerEnv } from '@liberscript/core';
import { s3Driver } from './s3';
import { localDriver } from './local';
import type { PresignDownloadInput, PresignUploadInput, StorageDriver } from './types';

let driver: StorageDriver | undefined;

/** The active storage backend, chosen by STORAGE_DRIVER. */
function getDriver(): StorageDriver {
  if (!driver) {
    driver = getServerEnv().STORAGE_DRIVER === 's3' ? s3Driver : localDriver;
  }
  return driver;
}

/** Deterministic object key for an uploaded asset. */
export function buildAssetKey(input: {
  ownerType: string;
  ownerId: string;
  assetId: string;
  fileName: string;
}): string {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${input.ownerType.toLowerCase()}/${input.ownerId}/assets/${input.assetId}/${safeName}`;
}

export function presignUpload(input: PresignUploadInput): Promise<string> {
  return getDriver().presignUpload(input);
}

export function presignDownload(input: PresignDownloadInput): Promise<string> {
  return getDriver().presignDownload(input);
}

export function getObjectBuffer(key: string): Promise<Buffer> {
  return getDriver().getObjectBuffer(key);
}

export function putObjectBuffer(key: string, body: Buffer, contentType?: string): Promise<void> {
  return getDriver().putObjectBuffer(key, body, contentType);
}

export function deleteObject(key: string): Promise<void> {
  return getDriver().deleteObject(key);
}

export { verifyStorageToken } from './local';
export type { StorageDriver, PresignUploadInput, PresignDownloadInput } from './types';
