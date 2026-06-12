import Stripe from 'stripe';
import { getServerEnv } from '@liberscript/core';
import { planKeyFor, requireSecret } from './config';
import type { PaymentConfigRow, PaymentProviderClient } from './types';

function getClient(cfg: PaymentConfigRow): Stripe {
  return new Stripe(requireSecret(cfg, 'secretKey'));
}

export const stripeClient: PaymentProviderClient = {
  async checkout(cfg, params) {
    const plans = (cfg.config.plans as Record<string, string> | undefined) ?? {};
    const priceId = plans[planKeyFor(params.tier, params.interval)];
    if (!priceId) {
      throw new Error(`Stripe is not configured for ${params.tier} (${params.interval}).`);
    }
    const stripe = getClient(cfg);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: params.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        tier: params.tier,
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
