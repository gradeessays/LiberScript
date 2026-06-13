#!/usr/bin/env node
/**
 * Run before starting the web/worker process in production.
 * Validates ENCRYPTION_KEY decodes to exactly 32 bytes and prints a
 * ready-to-use replacement if it doesn't.
 *
 *   pnpm ensure-keys
 *   node scripts/ensure-keys.js
 *
 * Exit 0 = key is valid. Exit 1 = invalid key (human action required).
 */

const { randomBytes } = require('crypto');

const raw = process.env.ENCRYPTION_KEY;

if (!raw) {
  const good = randomBytes(32).toString('base64');
  console.error(`
ERROR: ENCRYPTION_KEY is not set.

Add the following line to your production environment:

  ENCRYPTION_KEY=${good}

Then restart the application.
`);
  process.exit(1);
}

const buf = Buffer.from(raw, 'base64');

if (buf.byteLength === 32) {
  console.log('ENCRYPTION_KEY OK (32 bytes).');
  process.exit(0);
}

// Common double-encode: openssl rand -base64 32 | base64 → 44 ASCII chars →
// base64-encoded again → ~60 chars → decodes to 44 bytes.
const good = randomBytes(32).toString('base64');
console.error(`
ERROR: ENCRYPTION_KEY decodes to ${buf.byteLength} bytes (expected 32).

This usually happens when the key was base64-encoded twice, e.g.:
  openssl rand -base64 32 | base64   ← wrong

Generate a correct key with:
  openssl rand -base64 32

Or use this freshly generated key (copy the value exactly, no trailing newline):
  ENCRYPTION_KEY=${good}

Then restart the application.
`);
process.exit(1);
