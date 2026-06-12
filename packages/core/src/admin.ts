import { getServerEnv } from './env';

/**
 * Returns true when `email` is in the `ADMIN_EMAILS` allowlist (comma-separated,
 * case-insensitive). Admin accounts bypass all plan limits and can access the
 * `/admin` portal.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = getServerEnv().ADMIN_EMAILS;
  if (!list) return false;
  const normalized = email.trim().toLowerCase();
  return list
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
