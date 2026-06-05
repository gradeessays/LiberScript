import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerEnv } from '@liberscript/core';
import type { PresignDownloadInput, PresignUploadInput, StorageDriver } from './types';

let client: S3Client | undefined;

function s3Config() {
  const env = getServerEnv();
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3 storage selected but S3_* environment variables are not configured.');
  }
  return env;
}

export function getS3Client(): S3Client {
  if (!client) {
    const env = s3Config();
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return client;
}

export const s3Driver: StorageDriver = {
  presignUpload(input: PresignUploadInput) {
    const command = new PutObjectCommand({
      Bucket: s3Config().S3_BUCKET,
      Key: input.key,
      ContentType: input.contentType,
    });
    return getSignedUrl(getS3Client(), command, { expiresIn: input.expiresIn ?? 600 });
  },

  presignDownload(input: PresignDownloadInput) {
    const command = new GetObjectCommand({
      Bucket: s3Config().S3_BUCKET,
      Key: input.key,
      ...(input.fileName
        ? { ResponseContentDisposition: `attachment; filename="${input.fileName}"` }
        : {}),
    });
    return getSignedUrl(getS3Client(), command, { expiresIn: input.expiresIn ?? 600 });
  },

  async getObjectBuffer(key: string) {
    const res = await getS3Client().send(
      new GetObjectCommand({ Bucket: s3Config().S3_BUCKET, Key: key }),
    );
    if (!res.Body) throw new Error(`Object not found: ${key}`);
    return Buffer.from(await res.Body.transformToByteArray());
  },

  async putObjectBuffer(key: string, body: Buffer, contentType?: string) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: s3Config().S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },

  async deleteObject(key: string) {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: s3Config().S3_BUCKET, Key: key }));
  },
};
