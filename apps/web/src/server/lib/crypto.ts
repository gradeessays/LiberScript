import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY env var is not set.');
  const buf = Buffer.from(raw, 'base64');
  if (buf.byteLength !== 32) throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return buf;
}

export function encryptApiKey(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV — recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptApiKey(ciphertext: string, iv: string, authTag: string): string {
  const key = getKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
