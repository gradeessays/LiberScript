import { PLAN_PRICING, type OwnerType, type PlanInterval } from '@liberscript/core';
import { requireSecret } from './config';
import type { CheckoutParams, PaymentConfigRow, PaymentProviderClient } from './types';

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

interface PayPalOrder {
  id: string;
  status: string;
  links: { rel: string; href: string }[];
}

async function checkoutOneTime(cfg: PaymentConfigRow, params: CheckoutParams): Promise<{ url: string }> {
  const pricing = PLAN_PRICING[params.interval];
  const order = await paypalFetch<PayPalOrder>(cfg, '/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: (pricing.amountCents / 100).toFixed(2) },
          custom_id: JSON.stringify({
            ownerType: params.ownerType,
            ownerId: params.ownerId,
            interval: params.interval,
          }),
        },
      ],
      application_context: {
        return_url: params.successUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });
  const approve = order.links.find((l) => l.rel === 'approve');
  if (!approve) throw new Error('PayPal did not return an approval link.');
  return { url: approve.href };
}

export const paypalClient: PaymentProviderClient = {
  async checkout(cfg, params) {
    return checkoutOneTime(cfg, params);
  },
};

interface PayPalCaptureResult {
  ownerType: OwnerType;
  ownerId: string;
  interval: PlanInterval;
  payerId: string | null;
}

/** Captures a previously-created one-time Orders v2 order and parses its `custom_id`. */
export async function capturePaypalOrder(cfg: PaymentConfigRow, orderId: string): Promise<PayPalCaptureResult> {
  const result = await paypalFetch<{
    status: string;
    payer?: { payer_id?: string };
    purchase_units: { custom_id?: string }[];
  }>(cfg, `/v2/checkout/orders/${orderId}/capture`, { method: 'POST' });
  if (result.status !== 'COMPLETED') {
    throw new Error('PayPal order not completed.');
  }
  const customId = result.purchase_units[0]?.custom_id;
  if (!customId) {
    throw new Error('PayPal order is missing custom_id.');
  }
  const parsed = JSON.parse(customId) as { ownerType: OwnerType; ownerId: string; interval: PlanInterval };
  return { ...parsed, payerId: result.payer?.payer_id ?? null };
}

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
