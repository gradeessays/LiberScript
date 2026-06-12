import { PAYMENT_PROVIDERS, type PaymentProvider, type PlanFieldKey, type PlanInterval } from '@liberscript/core';
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
    const secrets = decryptSecrets(row);
    if (def.secretFields.every((f) => Boolean(secrets[f.key]))) {
      active.push(provider);
    }
  }
  return active;
}

/**
 * Maps a recurring interval to the `config.plans` key used by PayPal/Paystack
 * (Stripe needs no plan codes — it uses inline price_data for every interval).
 * Only MONTH/YEAR are recurring; never called for DAY/WEEK.
 */
export function planKeyFor(interval: PlanInterval): PlanFieldKey {
  return interval.toLowerCase() as PlanFieldKey;
}

/** Reads a required secret field, throwing if the provider is misconfigured. */
export function requireSecret(cfg: PaymentConfigRow, key: string): string {
  const value = cfg.secrets[key];
  if (!value) throw new Error(`Payment provider is missing required secret "${key}".`);
  return value;
}
