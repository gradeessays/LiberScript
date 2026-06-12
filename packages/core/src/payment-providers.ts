import { PaymentProvider } from './constants';

/** A single configurable field for a payment provider (admin form + storage key). */
export interface PaymentProviderField {
  key: string;
  label: string;
  placeholder?: string;
  /** Render as a <select> with these options instead of a text input (e.g. PayPal mode). */
  options?: { value: string; label: string }[];
}

/** Plan/price IDs configured per (tier, interval) — same four slots for every provider. */
export const PLAN_FIELD_KEYS = ['proMonthly', 'proAnnual', 'teamMonthly', 'teamAnnual'] as const;
export type PlanFieldKey = (typeof PLAN_FIELD_KEYS)[number];

export interface PaymentProviderDefinition {
  provider: PaymentProvider;
  label: string;
  /** Stored encrypted as a single JSON blob (PaymentProviderConfig.ciphertext/iv/authTag). */
  secretFields: PaymentProviderField[];
  /** Stored as plaintext JSON (PaymentProviderConfig.config). */
  configFields: PaymentProviderField[];
  /** Label for the per-(tier,interval) plan/price ID inputs, e.g. "Price ID". */
  planLabel: string;
}

export const PAYMENT_PROVIDERS: Record<PaymentProvider, PaymentProviderDefinition> = {
  STRIPE: {
    provider: PaymentProvider.STRIPE,
    label: 'Stripe',
    secretFields: [
      { key: 'secretKey', label: 'Secret key', placeholder: 'sk_live_...' },
      { key: 'webhookSecret', label: 'Webhook signing secret', placeholder: 'whsec_...' },
    ],
    configFields: [{ key: 'publishableKey', label: 'Publishable key', placeholder: 'pk_live_...' }],
    planLabel: 'Price ID',
  },
  PAYPAL: {
    provider: PaymentProvider.PAYPAL,
    label: 'PayPal',
    secretFields: [
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client secret' },
    ],
    configFields: [
      {
        key: 'mode',
        label: 'Mode',
        options: [
          { value: 'sandbox', label: 'Sandbox' },
          { value: 'live', label: 'Live' },
        ],
      },
      { key: 'webhookId', label: 'Webhook ID' },
    ],
    planLabel: 'Plan ID',
  },
  PAYSTACK: {
    provider: PaymentProvider.PAYSTACK,
    label: 'Paystack',
    secretFields: [{ key: 'secretKey', label: 'Secret key', placeholder: 'sk_live_...' }],
    configFields: [{ key: 'publicKey', label: 'Public key', placeholder: 'pk_live_...' }],
    planLabel: 'Plan code',
  },
};
