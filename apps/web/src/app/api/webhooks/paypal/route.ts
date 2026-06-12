import { type NextRequest, NextResponse } from 'next/server';
import { OwnerType, PaymentProvider, PlanTier } from '@liberscript/core';
import { prisma, SubscriptionStatus } from '@liberscript/db';
import { getPaymentProviderConfig, verifyPayPalWebhookSignature } from '@/server/lib/payments';

interface PayPalWebhookEvent {
  event_type: string;
  resource: {
    id?: string;
    plan_id?: string;
    custom_id?: string;
    subscriber?: { payer_id?: string };
    billing_info?: { next_billing_time?: string };
  };
}

/** Subscription approved + activated: links our owner to the PayPal subscription. */
async function handleSubscriptionActivated(resource: PayPalWebhookEvent['resource']) {
  if (!resource.custom_id || !resource.id) return;
  let custom: { ownerType?: string; ownerId?: string; tier?: string };
  try {
    custom = JSON.parse(resource.custom_id) as { ownerType?: string; ownerId?: string; tier?: string };
  } catch {
    return;
  }
  if (!custom.ownerType || !custom.ownerId || !custom.tier) return;
  if (custom.ownerType !== OwnerType.USER && custom.ownerType !== OwnerType.ORGANIZATION) return;

  const ownerType = custom.ownerType;
  const ownerId = custom.ownerId;
  const tier = custom.tier as PlanTier;
  const subscriptionId = resource.id;

  await prisma.subscription.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: {
      ownerType,
      ownerId,
      tier,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYPAL,
      providerCustomerId: resource.subscriber?.payer_id ?? null,
      providerSubscriptionId: subscriptionId,
      providerPlanId: resource.plan_id ?? null,
    },
    update: {
      tier,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYPAL,
      providerSubscriptionId: subscriptionId,
      ...(resource.subscriber?.payer_id ? { providerCustomerId: resource.subscriber.payer_id } : {}),
      ...(resource.plan_id ? { providerPlanId: resource.plan_id } : {}),
    },
  });
}

/** Renewal date refreshed. */
async function handleSubscriptionUpdated(resource: PayPalWebhookEvent['resource']) {
  if (!resource.id) return;
  const sub = await prisma.subscription.findUnique({
    where: {
      provider_providerSubscriptionId: { provider: PaymentProvider.PAYPAL, providerSubscriptionId: resource.id },
    },
  });
  if (!sub) return;

  if (!resource.billing_info?.next_billing_time) return;
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { currentPeriodEnd: new Date(resource.billing_info.next_billing_time) },
  });
}

/** Subscription cancelled (downgrade now) or suspended (mark past due, keep tier). */
async function handleSubscriptionEnded(resource: PayPalWebhookEvent['resource'], downgradeNow: boolean) {
  if (!resource.id) return;
  const sub = await prisma.subscription.findUnique({
    where: {
      provider_providerSubscriptionId: { provider: PaymentProvider.PAYPAL, providerSubscriptionId: resource.id },
    },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: downgradeNow ? SubscriptionStatus.CANCELED : SubscriptionStatus.PAST_DUE,
      ...(downgradeNow ? { tier: PlanTier.FREE } : {}),
    },
  });
}

export async function POST(req: NextRequest) {
  const cfg = await getPaymentProviderConfig(PaymentProvider.PAYPAL);
  if (!cfg?.enabled) {
    return new Response('PayPal is not configured.', { status: 503 });
  }

  const raw = await req.text();
  const verified = await verifyPayPalWebhookSignature(
    cfg,
    {
      authAlgo: req.headers.get('paypal-auth-algo'),
      certUrl: req.headers.get('paypal-cert-url'),
      transmissionId: req.headers.get('paypal-transmission-id'),
      transmissionSig: req.headers.get('paypal-transmission-sig'),
      transmissionTime: req.headers.get('paypal-transmission-time'),
    },
    raw,
  );
  if (!verified) {
    return new Response('Invalid signature.', { status: 401 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(raw) as PayPalWebhookEvent;
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  try {
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(event.resource);
        break;
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(event.resource);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionEnded(event.resource, true);
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionEnded(event.resource, false);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('PayPal webhook handling error', err);
  }

  // Always 200 quickly so PayPal doesn't retry-storm us.
  return NextResponse.json({ received: true });
}
