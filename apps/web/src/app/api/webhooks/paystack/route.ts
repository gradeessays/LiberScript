import crypto from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { computeRenewedPeriodEnd, OwnerType, PaymentProvider, PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { prisma, SubscriptionStatus } from '@liberscript/db';
import { getPaymentProviderConfig } from '@/server/lib/payments';

interface PaystackWebhookEvent {
  event: string;
  data: {
    metadata?: { ownerType?: string; ownerId?: string; interval?: string };
    customer?: { customer_code?: string };
  };
}

function isPlanInterval(value: string | undefined): value is PlanInterval {
  return Boolean(value) && Object.values(PlanInterval).includes(value as PlanInterval);
}

function verifySignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleChargeSuccess(data: PaystackWebhookEvent['data']) {
  const { metadata } = data;
  if (!metadata?.ownerType || !metadata.ownerId || !isPlanInterval(metadata.interval)) return;
  if (metadata.ownerType !== OwnerType.USER && metadata.ownerType !== OwnerType.ORGANIZATION) return;

  const ownerType = metadata.ownerType;
  const ownerId = metadata.ownerId;
  const interval = metadata.interval;
  const customerCode = data.customer?.customer_code;
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
      provider: PaymentProvider.PAYSTACK,
      providerCustomerId: customerCode ?? null,
      providerSubscriptionId: null,
      currentPeriodEnd,
      reminderStage: 0,
    },
    update: {
      interval,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYSTACK,
      providerSubscriptionId: null,
      currentPeriodEnd,
      reminderStage: 0,
      ...(customerCode ? { providerCustomerId: customerCode } : {}),
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
      default:
        break;
    }
  } catch (err) {
    console.error('Paystack webhook handling error', err);
  }

  return NextResponse.json({ received: true });
}
