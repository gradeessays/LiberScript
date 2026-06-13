'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@liberscript/ui';
import { PaymentProvider, PLAN_PRICING, type PlanInterval } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';
import { PlanGrid } from '@/components/plan-grid';

function BillingSettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const token = searchParams.get('token');

  const utils = trpc.useUtils();
  const sub = trpc.billing.getSubscription.useQuery(undefined, {
    refetchInterval: (query) => {
      if (status !== 'success') return false;
      return query.state.data?.limits.projects === null ? false : 2000;
    },
  });
  const providers = trpc.billing.listProviders.useQuery();

  // Checkout completed and the plan is now active — send the user straight
  // into the app instead of leaving them on the billing page.
  useEffect(() => {
    if (status === 'success' && sub.data?.limits.projects === null) {
      router.replace('/dashboard');
    }
  }, [status, sub.data, router]);

  const checkout = trpc.billing.checkout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
  const capture = trpc.billing.capturePaypalOrder.useMutation({
    onSuccess: () => {
      void utils.billing.getSubscription.invalidate();
      router.replace('/settings/billing');
    },
  });

  const captureAttempted = useRef(false);
  useEffect(() => {
    if (token && !captureAttempted.current) {
      captureAttempted.current = true;
      capture.mutate({ orderId: token });
    }
  }, [token, capture]);

  const subscription = sub.data?.subscription;
  const isAdmin = sub.data?.isAdmin;
  const hasAccess = sub.data?.limits.projects === null;
  const activeProviders = providers.data ?? [];

  const cardProvider =
    activeProviders.find((p) => p.provider === PaymentProvider.STRIPE) ??
    activeProviders.find((p) => p.provider === PaymentProvider.PAYSTACK);
  const paypalProvider = activeProviders.find((p) => p.provider === PaymentProvider.PAYPAL);

  const planGrid = (
    <PlanGrid
      footer={(interval) => {
        const showCard = Boolean(cardProvider);
        const showPaypal = Boolean(paypalProvider);
        const isCardPending =
          checkout.isPending &&
          checkout.variables?.interval === interval &&
          checkout.variables.provider === cardProvider?.provider;
        const isPaypalPending =
          checkout.isPending &&
          checkout.variables?.interval === interval &&
          checkout.variables.provider === PaymentProvider.PAYPAL;

        return (
          <>
            {showCard && (
              <Button
                className="w-full"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate({ provider: cardProvider!.provider, interval })}
              >
                {isCardPending ? 'Redirecting…' : 'Pay with card'}
              </Button>
            )}
            {showPaypal && (
              <Button
                className="w-full"
                variant="outline"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate({ provider: PaymentProvider.PAYPAL, interval })}
              >
                {isPaypalPending ? 'Redirecting…' : 'PayPal'}
              </Button>
            )}
            {!showCard && !showPaypal && (
              <p className="text-center text-sm text-muted-foreground">
                This plan isn&apos;t available yet. Check back soon.
              </p>
            )}
          </>
        );
      }}
    />
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your plan and payment details.</p>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          Admin account: all plan limits are bypassed regardless of subscription status.
        </div>
      )}

      {token && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          {capture.isError
            ? `We couldn't confirm your PayPal payment: ${capture.error.message}`
            : 'Activating your plan…'}
        </div>
      )}

      {status === 'success' && !token && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          Payment received. Activating your plan, this usually takes just a few seconds.
        </div>
      )}

      {status === 'cancelled' && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Checkout cancelled. You weren&apos;t charged.
        </div>
      )}

      {checkout.error && <p className="text-sm text-destructive">{checkout.error.message}</p>}
      {providers.error && (
        <p className="text-sm text-destructive">
          Couldn&apos;t load payment options: {providers.error.message}
        </p>
      )}

      {hasAccess && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Current plan:{' '}
                {subscription?.interval ? PLAN_PRICING[subscription.interval as PlanInterval].label : 'Active'}
              </CardTitle>
              {subscription && (
                <CardDescription>
                  Status: {subscription.status}
                  {subscription.currentPeriodEnd
                    ? ` · Expires ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : ''}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Plans don&apos;t auto-renew. Buy another pass below any time, it stacks on top of your remaining
                time.
              </p>
            </CardContent>
          </Card>

          <div>
            <p className="mb-4 text-sm font-medium">Renew or switch plans</p>
            {planGrid}
          </div>
        </>
      )}

      {!hasAccess && sub.data && (
        <>
          <p className="text-sm text-muted-foreground">
            Choose a plan to start creating and exporting your books. Every plan unlocks the same full feature
            set, so pick whatever fits how you write.
          </p>
          {planGrid}
        </>
      )}
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={null}>
      <BillingSettingsInner />
    </Suspense>
  );
}
