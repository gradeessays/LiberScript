import { PLAN_PRICING } from '@liberscript/core';
import { requireSecret } from './config';
import type { PaymentProviderClient } from './types';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackFetch<T>(secretKey: string, path: string, init?: RequestInit): Promise<PaystackResponse<T>> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !json.status) {
    throw new Error(`Paystack error: ${json.message || res.statusText}`);
  }
  return json;
}

interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export const paystackClient: PaymentProviderClient = {
  async checkout(cfg, params) {
    const secretKey = requireSecret(cfg, 'secretKey');
    const pricing = PLAN_PRICING[params.interval];
    const result = await paystackFetch<InitializeTransactionResult>(secretKey, '/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        amount: pricing.amountCents,
        callback_url: params.successUrl,
        metadata: {
          ownerType: params.ownerType,
          ownerId: params.ownerId,
          interval: params.interval,
        },
      }),
    });
    return { url: result.data.authorization_url };
  },
};
