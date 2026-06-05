export interface PresignUploadInput {
  key: string;
  contentType: string;
  expiresIn?: number;
}

export interface PresignDownloadInput {
  key: string;
  expiresIn?: number;
  fileName?: string;
}

/** Storage backend abstraction. Implemented by the S3 and local-disk drivers. */
export interface StorageDriver {
  /** A URL the browser can PUT a file to directly. */
  presignUpload(input: PresignUploadInput): Promise<string>;
  /** A time-limited URL to download an object. */
  presignDownload(input: PresignDownloadInput): Promise<string>;
  getObjectBuffer(key: string): Promise<Buffer>;
  putObjectBuffer(key: string, body: Buffer, contentType?: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
}
