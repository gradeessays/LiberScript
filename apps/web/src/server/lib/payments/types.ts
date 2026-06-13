import type { OwnerType, PlanInterval } from '@liberscript/core';

/** Decrypted, ready-to-use config for one payment provider. */
export interface PaymentConfigRow {
  enabled: boolean;
  /** Decrypted secret fields (e.g. secretKey, webhookSecret, clientSecret). */
  secrets: Record<string, string>;
  /** Plaintext config: publishable/public keys, mode, webhook id. */
  config: Record<string, unknown>;
}

export interface CheckoutParams {
  email: string;
  interval: PlanInterval;
  ownerType: OwnerType;
  ownerId: string;
  successUrl: string;
  cancelUrl: string;
}

/** Implemented by each provider module (stripe.ts, paypal.ts, paystack.ts). */
export interface PaymentProviderClient {
  checkout(cfg: PaymentConfigRow, params: CheckoutParams): Promise<{ url: string }>;
}
