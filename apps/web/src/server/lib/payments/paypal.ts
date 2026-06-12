import { planKeyFor, requireSecret } from './config';
import type { PaymentConfigRow, PaymentProviderClient } from './types';

const PAYPAL_BASE_URLS: Record<'sandbox' | 'live', string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

function baseUrl(cfg: PaymentConfigRow): string {
  const mode = cfg.config.mode === 'live' ? 'live' : 'sandbox';
  return PAYPAL_BASE_URLS[mode];
}

async function getAccessToken(cfg: PaymentConfigRow): Promise<string> {
  const clientId = requireSecret(cfg, 'clientId');
  const clientSecret = requireSecret(cfg, 'clientSecret');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${baseUrl(cfg)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal OAuth error: ${res.statusText}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function paypalFetch<T>(cfg: PaymentConfigRow, path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken(cfg);
  const res = await fetch(`${baseUrl(cfg)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal error (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

interface PayPalSubscription {
  id: string;
  links: { rel: string; href: string }[];
}

export const paypalClient: PaymentProviderClient = {
  async checkout(cfg, params) {
    const plans = (cfg.config.plans as Record<string, string> | undefined) ?? {};
    const planId = plans[planKeyFor(params.tier, params.interval)];
    if (!planId) {
      throw new Error(`PayPal is not configured for ${params.tier} (${params.interval}).`);
    }
    const sub = await paypalFetch<PayPalSubscription>(cfg, '/v1/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        subscriber: { email_address: params.email },
        custom_id: JSON.stringify({
          ownerType: params.ownerType,
          ownerId: params.ownerId,
          tier: params.tier,
          interval: params.interval,
        }),
        application_context: {
          return_url: params.successUrl,
          cancel_url: params.cancelUrl,
        },
      }),
    });
    const approve = sub.links.find((l) => l.rel === 'approve');
    if (!approve) throw new Error('PayPal did not return an approval link.');
    return { url: approve.href };
  },

  // PayPal has no merchant-agnostic "manage subscription" portal link.
  async manageSubscription() {
    return null;
  },

  async cancelSubscription(cfg, sub) {
    if (!sub.providerSubscriptionId) {
      throw new Error('No PayPal subscription to cancel.');
    }
    await paypalFetch<void>(cfg, `/v1/billing/subscriptions/${sub.providerSubscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Cancelled by customer' }),
    });
  },
};

interface PayPalWebhookHeaders {
  authAlgo: string | null;
  certUrl: string | null;
  transmissionId: string | null;
  transmissionSig: string | null;
  transmissionTime: string | null;
}

/** Verifies a PayPal webhook event via the `/v1/notifications/verify-webhook-signature` API. */
export async function verifyPayPalWebhookSignature(
  cfg: PaymentConfigRow,
  headers: PayPalWebhookHeaders,
  rawBody: string,
): Promise<boolean> {
  const webhookId = typeof cfg.config.webhookId === 'string' ? cfg.config.webhookId : undefined;
  if (!webhookId) return false;
  const result = await paypalFetch<{ verification_status: string }>(
    cfg,
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody) as unknown,
      }),
    },
  );
  return result.verification_status === 'SUCCESS';
}
