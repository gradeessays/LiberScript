'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@liberscript/ui';
import { PaymentProvider, PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const PLAN_ORDER = [PlanInterval.DAY, PlanInterval.WEEK, PlanInterval.MONTH, PlanInterval.YEAR] as const;

const PLAN_CADENCE: Record<PlanInterval, string> = {
  DAY: 'Full access for 24 hours',
  WEEK: 'Full access for 7 days',
  MONTH: 'Full access, billed monthly',
  YEAR: 'Full access, billed yearly',
};

const PLAN_FEATURES = [
  'Unlimited books',
  'All export formats (EPUB, PDF, DOCX)',
  'BYO-AI writing, critique & KDP metadata',
  'Custom fonts & premium themes',
  'No watermark on exports',
  'Unlimited collaborators',
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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

  const checkout = trpc.billing.checkout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
  const manage = trpc.billing.manageSubscription.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
  const cancel = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => void utils.billing.getSubscription.invalidate(),
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

  const canManage = Boolean(subscription?.providerSubscriptionId) && subscription?.provider !== PaymentProvider.PAYPAL;
  const canCancel = Boolean(subscription?.providerSubscriptionId);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your plan and payment details.</p>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          Admin account — all plan limits are bypassed regardless of subscription status.
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
          Payment received — activating your plan… this usually takes just a few seconds.
        </div>
      )}

      {status === 'cancelled' && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Checkout cancelled — you weren&apos;t charged.
        </div>
      )}

      {hasAccess && (
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
                  ? ` · Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You&apos;re all set — enjoy unlimited books and full access. You can choose a different plan once your
              current one ends.
            </p>
          </CardContent>
          {(canManage || canCancel) && (
            <CardFooter className="gap-2">
              {canManage && (
                <Button variant="outline" onClick={() => manage.mutate()} disabled={manage.isPending}>
                  {manage.isPending ? 'Loading…' : 'Manage billing'}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Cancel your plan? You will lose access immediately.')) {
                      cancel.mutate();
                    }
                  }}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending ? 'Cancelling…' : 'Cancel plan'}
                </Button>
              )}
            </CardFooter>
          )}
          {(manage.error || cancel.error) && (
            <CardContent>
              <p className="text-sm text-destructive">{(manage.error ?? cancel.error)?.message}</p>
            </CardContent>
          )}
        </Card>
      )}

      {!hasAccess && sub.data && (
        <>
          <p className="text-sm text-muted-foreground">
            Choose a plan to start creating and exporting your books. Every plan unlocks the same full feature set —
            pick whatever fits how you write.
          </p>

          {checkout.error && <p className="text-sm text-destructive">{checkout.error.message}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            {PLAN_ORDER.map((interval) => {
              const pricing = PLAN_PRICING[interval];
              const showCard = Boolean(cardProvider) && (!pricing.recurring || cardProvider!.supportsRecurring);
              const showPaypal = Boolean(paypalProvider) && (!pricing.recurring || paypalProvider!.supportsRecurring);
              const isCardPending =
                checkout.isPending &&
                checkout.variables?.interval === interval &&
                checkout.variables.provider === cardProvider?.provider;
              const isPaypalPending =
                checkout.isPending &&
                checkout.variables?.interval === interval &&
                checkout.variables.provider === PaymentProvider.PAYPAL;

              return (
                <Card key={interval}>
                  <CardHeader>
                    <CardTitle>
                      {pricing.label} — {formatPrice(pricing.amountCents)}
                      {pricing.recurring ? (interval === PlanInterval.YEAR ? '/yr' : '/mo') : ''}
                    </CardTitle>
                    <CardDescription>{PLAN_CADENCE[interval]}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {PLAN_FEATURES.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
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
                        Check back soon — this plan isn&apos;t available yet.
                      </p>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
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
