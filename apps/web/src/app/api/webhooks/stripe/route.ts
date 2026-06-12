import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { OwnerType, PaymentProvider, PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { prisma, SubscriptionStatus } from '@liberscript/db';
import { getPaymentProviderConfig } from '@/server/lib/payments';

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: SubscriptionStatus.ACTIVE,
  trialing: SubscriptionStatus.TRIALING,
  past_due: SubscriptionStatus.PAST_DUE,
  canceled: SubscriptionStatus.CANCELED,
  incomplete: SubscriptionStatus.INCOMPLETE,
  incomplete_expired: SubscriptionStatus.CANCELED,
  unpaid: SubscriptionStatus.PAST_DUE,
};

function isPlanInterval(value: string | undefined): value is PlanInterval {
  return Boolean(value) && Object.values(PlanInterval).includes(value as PlanInterval);
}

/** Checkout completed: links our owner to the Stripe customer + activates their plan. */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { metadata } = session;
  if (!metadata?.ownerType || !metadata.ownerId || !isPlanInterval(metadata.interval)) return;
  if (metadata.ownerType !== OwnerType.USER && metadata.ownerType !== OwnerType.ORGANIZATION) return;

  const ownerType = metadata.ownerType;
  const ownerId = metadata.ownerId;
  const interval = metadata.interval;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (session.mode === 'payment') {
    // One-time Day/Week pass: activate immediately for its fixed duration.
    const pricing = PLAN_PRICING[interval];
    const currentPeriodEnd = new Date(Date.now() + (pricing.durationDays ?? 0) * 24 * 60 * 60 * 1000);
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
      },
      update: {
        interval,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: null,
        currentPeriodEnd,
        ...(customerId ? { providerCustomerId: customerId } : {}),
      },
    });
    return;
  }

  // Recurring Month/Year: currentPeriodEnd is filled in by the subscription.created/updated event.
  await prisma.subscription.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: {
      ownerType,
      ownerId,
      interval,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.STRIPE,
      providerCustomerId: customerId ?? null,
      providerSubscriptionId: subscriptionId ?? null,
    },
    update: {
      interval,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.STRIPE,
      ...(customerId ? { providerCustomerId: customerId } : {}),
      ...(subscriptionId ? { providerSubscriptionId: subscriptionId } : {}),
    },
  });
}

/** Subscription created/updated: keep status, interval, and renewal date in sync. */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const sub = await prisma.subscription.findUnique({
    where: {
      provider_providerSubscriptionId: { provider: PaymentProvider.STRIPE, providerSubscriptionId: subscription.id },
    },
  });
  if (!sub) return;

  const status = STRIPE_STATUS_MAP[subscription.status] ?? SubscriptionStatus.ACTIVE;
  const interval = subscription.metadata?.interval;
  const periodEnd = subscription.current_period_end;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status,
      ...(isPlanInterval(interval) ? { interval } : {}),
      ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
    },
  });
}

/** Subscription cancelled: revoke access immediately (starts the deletion grace period). */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const sub = await prisma.subscription.findUnique({
    where: {
      provider_providerSubscriptionId: { provider: PaymentProvider.STRIPE, providerSubscriptionId: subscription.id },
    },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: SubscriptionStatus.CANCELED },
  });
}

/** Renewal payment failed. */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const sub = await prisma.subscription.findUnique({
    where: { provider_providerSubscriptionId: { provider: PaymentProvider.STRIPE, providerSubscriptionId: subscriptionId } },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: SubscriptionStatus.PAST_DUE },
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
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handling error', err);
  }

  // Always 200 quickly so Stripe doesn't retry-storm us.
  return NextResponse.json({ received: true });
}
