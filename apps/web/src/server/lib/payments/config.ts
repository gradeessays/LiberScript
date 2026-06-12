import { PAYMENT_PROVIDERS, PlanTier, type PaymentProvider, type PlanFieldKey } from '@liberscript/core';
import { prisma } from '@liberscript/db';
import { decryptJson } from '../crypto';
import type { BillingInterval, PaidTier, PaymentConfigRow } from './types';

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

/** Maps a (tier, interval) pair to the `config.plans` key used by every provider. */
export function planKeyFor(tier: PaidTier, interval: BillingInterval): PlanFieldKey {
  const prefix = tier === PlanTier.PRO ? 'pro' : 'team';
  const suffix = interval === 'monthly' ? 'Monthly' : 'Annual';
  return `${prefix}${suffix}` as PlanFieldKey;
}

/** Reverse lookup: maps a provider's plan/price ID back to (tier, interval), if configured. */
export function tierForPlanId(
  cfg: PaymentConfigRow,
  planId: string | null | undefined,
): { tier: PaidTier; interval: BillingInterval } | undefined {
  if (!planId) return undefined;
  const plans = (cfg.config.plans as Record<string, string> | undefined) ?? {};
  for (const tier of [PlanTier.PRO, PlanTier.TEAM] as const) {
    for (const interval of ['monthly', 'annual'] as const) {
      if (plans[planKeyFor(tier, interval)] === planId) return { tier, interval };
    }
  }
  return undefined;
}

/** Reads a required secret field, throwing if the provider is misconfigured. */
export function requireSecret(cfg: PaymentConfigRow, key: string): string {
  const value = cfg.secrets[key];
  if (!value) throw new Error(`Payment provider is missing required secret "${key}".`);
  return value;
}
