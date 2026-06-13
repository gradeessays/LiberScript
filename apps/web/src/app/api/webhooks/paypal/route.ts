import { type NextRequest, NextResponse } from 'next/server';
import { computeRenewedPeriodEnd, OwnerType, PaymentProvider, PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { prisma, SubscriptionStatus } from '@liberscript/db';
import { getPaymentProviderConfig, verifyPayPalWebhookSignature } from '@/server/lib/payments';

interface PayPalWebhookEvent {
  event_type: string;
  resource: {
    id?: string;
    custom_id?: string;
  };
}

function isPlanInterval(value: string | undefined): value is PlanInterval {
  return Boolean(value) && Object.values(PlanInterval).includes(value as PlanInterval);
}

/**
 * One-time pass captured via the Orders v2 flow. Idempotent backup to the
 * client-driven `billing.capturePaypalOrder` mutation — both upsert the same
 * row from the same `custom_id` and stack on remaining time.
 */
async function handlePaymentCaptureCompleted(resource: PayPalWebhookEvent['resource']) {
  if (!resource.custom_id) return;
  let custom: { ownerType?: string; ownerId?: string; interval?: string };
  try {
    custom = JSON.parse(resource.custom_id) as { ownerType?: string; ownerId?: string; interval?: string };
  } catch {
    return;
  }
  if (!custom.ownerType || !custom.ownerId || !isPlanInterval(custom.interval)) return;
  if (custom.ownerType !== OwnerType.USER && custom.ownerType !== OwnerType.ORGANIZATION) return;

  const ownerType = custom.ownerType;
  const ownerId = custom.ownerId;
  const interval = custom.interval;
  const pricing = PLAN_PRICING[interval];

  const existing = await prisma.subscription.findUnique({ where: { ownerType_ownerId: { ownerType, ownerId } } });
  const currentPeriodEnd = computeRenewedPeriodEnd(existing?.currentPeriodEnd, pricing.durationDays);

  await prisma.subscription.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: {
      ownerType,
      ownerId,
      interval,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYPAL,
      providerSubscriptionId: null,
      currentPeriodEnd,
      reminderStage: 0,
    },
    update: {
      interval,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYPAL,
      providerSubscriptionId: null,
      currentPeriodEnd,
      reminderStage: 0,
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
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event.resource);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('PayPal webhook handling error', err);
  }

  return NextResponse.json({ received: true });
}
