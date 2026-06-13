import Stripe from 'stripe';
import { PLAN_PRICING } from '@liberscript/core';
import { requireSecret } from './config';
import type { PaymentConfigRow, PaymentProviderClient } from './types';

function getClient(cfg: PaymentConfigRow): Stripe {
  return new Stripe(requireSecret(cfg, 'secretKey'));
}

export const stripeClient: PaymentProviderClient = {
  async checkout(cfg, params) {
    const stripe = getClient(cfg);
    const pricing = PLAN_PRICING[params.interval];
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: params.email,
      customer_creation: 'always',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: pricing.amountCents,
            product_data: { name: `LiberScript — ${pricing.label}` },
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        interval: params.interval,
      },
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return { url: session.url };
  },
};
