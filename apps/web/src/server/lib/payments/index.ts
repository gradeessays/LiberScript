import { PaymentProvider } from '@liberscript/core';
import { paypalClient } from './paypal';
import { paystackClient } from './paystack';
import { stripeClient } from './stripe';
import type { PaymentProviderClient } from './types';

export const PAYMENT_CLIENTS: Record<PaymentProvider, PaymentProviderClient> = {
  [PaymentProvider.STRIPE]: stripeClient,
  [PaymentProvider.PAYPAL]: paypalClient,
  [PaymentProvider.PAYSTACK]: paystackClient,
};

export * from './config';
export * from './types';
export { capturePaypalOrder, verifyPayPalWebhookSignature } from './paypal';
