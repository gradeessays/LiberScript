/**
 * Generate a prefixed, URL-safe id, e.g. `proj_a1b2...`.
 * Uses the Web Crypto API (available in Node 18+ and browsers) so this module
 * stays isomorphic — importable from both server and client bundles.
 */
export function createId(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
}

/** Convert arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
