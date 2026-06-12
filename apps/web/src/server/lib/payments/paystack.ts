import { PLAN_PRICING } from '@liberscript/core';
import { planKeyFor, requireSecret } from './config';
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
    const metadata = {
      ownerType: params.ownerType,
      ownerId: params.ownerId,
      interval: params.interval,
    };
    let body: Record<string, unknown>;
    if (pricing.recurring) {
      const plans = (cfg.config.plans as Record<string, string> | undefined) ?? {};
      const planCode = plans[planKeyFor(params.interval)];
      if (!planCode) {
        throw new Error(`Paystack is not configured for ${params.interval}.`);
      }
      body = { email: params.email, plan: planCode, callback_url: params.successUrl, metadata };
    } else {
      body = {
        email: params.email,
        amount: pricing.amountCents,
        callback_url: params.successUrl,
        metadata,
      };
    }
    const result = await paystackFetch<InitializeTransactionResult>(secretKey, '/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { url: result.data.authorization_url };
  },

  async manageSubscription(cfg, sub) {
    if (!sub.providerSubscriptionId) return null;
    const secretKey = requireSecret(cfg, 'secretKey');
    const result = await paystackFetch<{ link: string }>(
      secretKey,
      `/subscription/${sub.providerSubscriptionId}/manage/link`,
    );
    return { url: result.data.link };
  },

  async cancelSubscription(cfg, sub) {
    if (!sub.providerSubscriptionId) {
      throw new Error('No Paystack subscription to cancel.');
    }
    const providerData = (sub.providerData as { emailToken?: string } | null) ?? {};
    if (!providerData.emailToken) {
      throw new Error('Missing Paystack email token; cannot cancel subscription.');
    }
    const secretKey = requireSecret(cfg, 'secretKey');
    await paystackFetch(secretKey, '/subscription/disable', {
      method: 'POST',
      body: JSON.stringify({ code: sub.providerSubscriptionId, token: providerData.emailToken }),
    });
  },
};
