import Stripe from 'stripe';
import { getServerEnv, PLAN_PRICING } from '@liberscript/core';
import { requireSecret } from './config';
import type { PaymentConfigRow, PaymentProviderClient } from './types';

function getClient(cfg: PaymentConfigRow): Stripe {
  return new Stripe(requireSecret(cfg, 'secretKey'));
}

export const stripeClient: PaymentProviderClient = {
  async checkout(cfg, params) {
    const stripe = getClient(cfg);
    const pricing = PLAN_PRICING[params.interval];
    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency: 'usd',
      unit_amount: pricing.amountCents,
      product_data: { name: `LiberScript — ${pricing.label}` },
      ...(pricing.recurring
        ? { recurring: { interval: params.interval === 'YEAR' ? 'year' : 'month' } }
        : {}),
    };
    const session = await stripe.checkout.sessions.create({
      mode: pricing.recurring ? 'subscription' : 'payment',
      customer_email: params.email,
      line_items: [{ price_data: priceData, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ...(pricing.recurring
        ? {
            subscription_data: {
              metadata: {
                ownerType: params.ownerType,
                ownerId: params.ownerId,
                interval: params.interval,
              },
            },
          }
        : { customer_creation: 'always' as const }),
      metadata: {
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        interval: params.interval,
      },
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return { url: session.url };
  },

  async manageSubscription(cfg, sub) {
    if (!sub.providerCustomerId) return null;
    const stripe = getClient(cfg);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.providerCustomerId,
      return_url: `${getServerEnv().APP_URL}/settings/billing`,
    });
    return { url: session.url };
  },

  async cancelSubscription(cfg, sub) {
    if (!sub.providerSubscriptionId) {
      throw new Error('No Stripe subscription to cancel.');
    }
    const stripe = getClient(cfg);
    await stripe.subscriptions.cancel(sub.providerSubscriptionId);
  },
};
