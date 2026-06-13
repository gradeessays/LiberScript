import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { computeRenewedPeriodEnd, OwnerType, PaymentProvider, PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { prisma, SubscriptionStatus } from '@liberscript/db';
import { getPaymentProviderConfig } from '@/server/lib/payments';

function isPlanInterval(value: string | undefined): value is PlanInterval {
  return Boolean(value) && Object.values(PlanInterval).includes(value as PlanInterval);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { metadata } = session;
  if (!metadata?.ownerType || !metadata.ownerId || !isPlanInterval(metadata.interval)) return;
  if (metadata.ownerType !== OwnerType.USER && metadata.ownerType !== OwnerType.ORGANIZATION) return;

  const ownerType = metadata.ownerType;
  const ownerId = metadata.ownerId;
  const interval = metadata.interval;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
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
      provider: PaymentProvider.STRIPE,
      providerCustomerId: customerId ?? null,
      providerSubscriptionId: null,
      currentPeriodEnd,
      reminderStage: 0,
    },
    update: {
      interval,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.STRIPE,
      providerSubscriptionId: null,
      currentPeriodEnd,
      reminderStage: 0,
      ...(customerId ? { providerCustomerId: customerId } : {}),
    },
  });
}

export async function POST(req: NextRequest) {
  const cfg = await getPaymentProviderConfig(PaymentProvider.STRIPE);
  const webhookSecret = cfg?.secrets.webhookSecret;
  const secretKey = cfg?.secrets.secretKey;
  if (!cfg?.enabled || !webhookSecret || !secretKey) {
    return new Response('Stripe is not configured.', { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature.', { status: 401 });
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return new Response('Invalid signature.', { status: 401 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handling error', err);
  }

  return NextResponse.json({ received: true });
}
