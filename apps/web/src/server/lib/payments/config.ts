import { PAYMENT_PROVIDERS, type PaymentProvider } from '@liberscript/core';
import { prisma } from '@liberscript/db';
import { decryptJson } from '../crypto';
import type { PaymentConfigRow } from './types';

function decryptSecrets(row: { ciphertext: string | null; iv: string | null; authTag: string | null }): Record<string, string> {
  if (!row.ciphertext || !row.iv || !row.authTag) return {};
  return decryptJson<Record<string, string>>(row.ciphertext, row.iv, row.authTag);
}

/** Loads the decrypted config for one provider, or null if it has never been configured. */
export async function getPaymentProviderConfig(provider: PaymentProvider): Promise<PaymentConfigRow | null> {
  const row = await prisma.paymentProviderConfig.findUnique({ where: { provider } });
  if (!row) return null;
  return {
    enabled: row.enabled,
    secrets: decryptSecrets(row),
    config: (row.config as Record<string, unknown> | null) ?? {},
  };
}

/** Providers that are enabled and have every required secret field set. */
export async function listActivePaymentProviders(): Promise<PaymentProvider[]> {
  const rows = await prisma.paymentProviderConfig.findMany({ where: { enabled: true } });
  const active: PaymentProvider[] = [];
  for (const row of rows) {
    const provider = row.provider as PaymentProvider;
    const def = PAYMENT_PROVIDERS[provider];
    let secrets: Record<string, string>;
    try {
      secrets = decryptSecrets(row);
    } catch {
      // Unreadable secrets (e.g. ENCRYPTION_KEY changed since saved) — skip this
      // provider rather than failing the whole list for every provider.
      continue;
    }
    if (def.secretFields.every((f) => Boolean(secrets[f.key]))) {
      active.push(provider);
    }
  }
  return active;
}

/** Reads a required secret field, throwing if the provider is misconfigured. */
export function requireSecret(cfg: PaymentConfigRow, key: string): string {
  const value = cfg.secrets[key];
  if (!value) throw new Error(`Payment provider is missing required secret "${key}".`);
  return value;
}
