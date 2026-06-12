import crypto from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { OwnerType, PaymentProvider, PlanTier } from '@liberscript/core';
import { prisma, SubscriptionStatus, type Subscription } from '@liberscript/db';
import { getPaymentProviderConfig, tierForPlanId, type PaymentConfigRow } from '@/server/lib/payments';

interface PaystackWebhookEvent {
  event: string;
  data: {
    metadata?: { ownerType?: string; ownerId?: string; tier?: string; interval?: string };
    customer?: { customer_code?: string };
    subscription_code?: string;
    email_token?: string;
    plan?: { plan_code?: string };
    next_payment_date?: string;
    period_end?: string;
    subscription?: { subscription_code?: string };
  };
}

/** Verifies the `x-paystack-signature` header (HMAC-SHA512 of the raw body). */
function verifySignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function findSubscription(input: {
  subscriptionCode?: string;
  customerCode?: string;
}): Promise<Subscription | null> {
  if (input.subscriptionCode) {
    const sub = await prisma.subscription.findUnique({
      where: {
        provider_providerSubscriptionId: {
          provider: PaymentProvider.PAYSTACK,
          providerSubscriptionId: input.subscriptionCode,
        },
      },
    });
    if (sub) return sub;
  }
  if (input.customerCode) {
    return prisma.subscription.findUnique({
      where: {
        provider_providerCustomerId: {
          provider: PaymentProvider.PAYSTACK,
          providerCustomerId: input.customerCode,
        },
      },
    });
  }
  return null;
}

/** First successful charge for a checkout: links our owner to the Paystack customer. */
async function handleChargeSuccess(data: PaystackWebhookEvent['data']) {
  const { metadata } = data;
  if (!metadata?.ownerType || !metadata.ownerId || !metadata.tier) return;
  if (metadata.ownerType !== OwnerType.USER && metadata.ownerType !== OwnerType.ORGANIZATION) return;

  const ownerType = metadata.ownerType;
  const ownerId = metadata.ownerId;
  const tier = metadata.tier as PlanTier;
  const customerCode = data.customer?.customer_code;

  await prisma.subscription.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: {
      ownerType,
      ownerId,
      tier,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYSTACK,
      providerCustomerId: customerCode ?? null,
    },
    update: {
      tier,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYSTACK,
      ...(customerCode ? { providerCustomerId: customerCode } : {}),
    },
  });
}

/** Subscription provisioned: store the subscription code + email token for cancellation. */
async function handleSubscriptionCreate(data: PaystackWebhookEvent['data'], cfg: PaymentConfigRow) {
  const customerCode = data.customer?.customer_code;
  if (!customerCode) return;

  const sub = await prisma.subscription.findUnique({
    where: {
      provider_providerCustomerId: { provider: PaymentProvider.PAYSTACK, providerCustomerId: customerCode },
    },
  });
  if (!sub) return;

  const planCode = data.plan?.plan_code;
  const tierInfo = tierForPlanId(cfg, planCode);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      ...(data.subscription_code ? { providerSubscriptionId: data.subscription_code } : {}),
      ...(data.email_token ? { providerData: { emailToken: data.email_token } } : {}),
      ...(planCode ? { providerPlanId: planCode } : {}),
      ...(tierInfo ? { tier: tierInfo.tier } : {}),
      ...(data.next_payment_date ? { currentPeriodEnd: new Date(data.next_payment_date) } : {}),
    },
  });
}

/** Renewal succeeded or failed: update status and (on success) the next renewal date. */
async function handleInvoiceUpdate(data: PaystackWebhookEvent['data'], status: SubscriptionStatus) {
  const sub = await findSubscription({
    subscriptionCode: data.subscription?.subscription_code,
    customerCode: data.customer?.customer_code,
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status,
      ...(status === SubscriptionStatus.ACTIVE && data.period_end
        ? { currentPeriodEnd: new Date(data.period_end) }
        : {}),
    },
  });
}

/** Subscription cancelled (immediately) or set to not renew (at period end). */
async function handleSubscriptionDisable(data: PaystackWebhookEvent['data'], downgradeNow: boolean) {
  const sub = await findSubscription({
    subscriptionCode: data.subscription_code,
    customerCode: data.customer?.customer_code,
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.CANCELED,
      ...(downgradeNow ? { tier: PlanTier.FREE } : {}),
    },
  });
}

export async function POST(req: NextRequest) {
  const cfg = await getPaymentProviderConfig(PaymentProvider.PAYSTACK);
  const secret = cfg?.secrets.secretKey;
  if (!cfg?.enabled || !secret) {
    return new Response('Paystack is not configured.', { status: 503 });
  }

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-paystack-signature'), secret)) {
    return new Response('Invalid signature.', { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(raw) as PaystackWebhookEvent;
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  try {
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'subscription.create':
        await handleSubscriptionCreate(event.data, cfg);
        break;
      case 'invoice.update':
        await handleInvoiceUpdate(event.data, SubscriptionStatus.ACTIVE);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceUpdate(event.data, SubscriptionStatus.PAST_DUE);
        break;
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data, true);
        break;
      case 'subscription.not_renew':
        await handleSubscriptionDisable(event.data, false);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('Paystack webhook handling error', err);
  }

  // Always 200 quickly so Paystack doesn't retry-storm us.
  return NextResponse.json({ received: true });
}
