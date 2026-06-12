'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@liberscript/ui';
import { PaymentProvider, PlanTier } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  TEAM: 'Team',
};

const TIER_FEATURES: Record<string, string[]> = {
  FREE: ['3 projects', '1 collaborator per project', 'PDF export', '10 analysis runs / month'],
  PRO: [
    'Unlimited projects',
    '3 collaborators per project',
    'All export formats',
    'BYO-AI writing, critique & KDP metadata',
    'Custom fonts & premium themes',
    'No watermark',
  ],
  TEAM: ['Everything in Pro', 'Unlimited collaborators', 'Unlimited analysis runs', 'Shared team billing'],
};

export default function BillingSettingsPage() {
  const utils = trpc.useUtils();
  const sub = trpc.billing.getSubscription.useQuery();
  const providers = trpc.billing.listProviders.useQuery();
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');

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

  const tier = sub.data?.tier ?? PlanTier.FREE;
  const subscription = sub.data?.subscription;
  const isAdmin = sub.data?.isAdmin;
  const activeProviders = providers.data ?? [];

  const canManage = Boolean(subscription?.providerSubscriptionId) && subscription?.provider !== PaymentProvider.PAYPAL;
  const canCancel = Boolean(subscription?.providerSubscriptionId);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription plan and payment details.
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          Admin account — all plan limits are bypassed regardless of subscription status.
        </div>
      )}

      {!providers.isLoading && activeProviders.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Billing is not yet configured.
          {isAdmin && (
            <>
              {' '}
              <Link href="/admin/payments" className="font-medium underline">
                Set up a payment provider
              </Link>
              .
            </>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current plan: {TIER_LABELS[tier] ?? tier}</CardTitle>
          {subscription && (
            <CardDescription>
              Status: {subscription.status}
              {subscription.currentPeriodEnd
                ? ` · Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                : ''}
            </CardDescription>
          )}
        </CardHeader>
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
                  if (confirm('Cancel your subscription? You will lose Pro/Team features immediately.')) {
                    cancel.mutate();
                  }
                }}
                disabled={cancel.isPending}
              >
                {cancel.isPending ? 'Cancelling…' : 'Cancel subscription'}
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

      {activeProviders.length > 0 && (
        <>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={interval === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInterval('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={interval === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInterval('annual')}
            >
              Annual (save 2 months)
            </Button>
          </div>

          {checkout.error && <p className="text-center text-sm text-destructive">{checkout.error.message}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            {([PlanTier.PRO, PlanTier.TEAM] as const).map((planTier) => (
              <Card key={planTier}>
                <CardHeader>
                  <CardTitle>{TIER_LABELS[planTier]}</CardTitle>
                  <CardDescription>
                    {planTier === PlanTier.PRO
                      ? 'For individual authors using their own AI keys.'
                      : 'For publishing teams with shared workspaces.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {(TIER_FEATURES[planTier] ?? []).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  {tier === planTier ? (
                    <Button className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : (
                    activeProviders.map(({ provider, label }) => {
                      const isThisPending =
                        checkout.isPending &&
                        checkout.variables?.provider === provider &&
                        checkout.variables.tier === planTier;
                      return (
                        <Button
                          key={provider}
                          className="w-full"
                          variant={provider === PaymentProvider.STRIPE ? 'default' : 'outline'}
                          disabled={checkout.isPending}
                          onClick={() => checkout.mutate({ provider, tier: planTier, interval })}
                        >
                          {isThisPending ? 'Redirecting…' : `Pay with ${label}`}
                        </Button>
                      );
                    })
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
