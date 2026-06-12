import type { OwnerType, PlanTier } from '@liberscript/core';
import type { Subscription } from '@liberscript/db';

export type BillingInterval = 'monthly' | 'annual';
export type PaidTier = typeof PlanTier.PRO | typeof PlanTier.TEAM;

/** Decrypted, ready-to-use config for one payment provider. */
export interface PaymentConfigRow {
  enabled: boolean;
  /** Decrypted secret fields (e.g. secretKey, webhookSecret, clientSecret). */
  secrets: Record<string, string>;
  /** Plaintext config: publishable/public keys, mode, webhook id, plan/price IDs (`plans`). */
  config: Record<string, unknown>;
}

export interface CheckoutParams {
  email: string;
  tier: PaidTier;
  interval: BillingInterval;
  ownerType: OwnerType;
  ownerId: string;
  successUrl: string;
  cancelUrl: string;
}

/** Implemented by each provider module (stripe.ts, paypal.ts, paystack.ts). */
export interface PaymentProviderClient {
  checkout(cfg: PaymentConfigRow, params: CheckoutParams): Promise<{ url: string }>;
  /** Returns null if the provider has no hosted "manage" portal (e.g. PayPal). */
  manageSubscription(cfg: PaymentConfigRow, sub: Subscription): Promise<{ url: string } | null>;
  cancelSubscription(cfg: PaymentConfigRow, sub: Subscription): Promise<void>;
}
