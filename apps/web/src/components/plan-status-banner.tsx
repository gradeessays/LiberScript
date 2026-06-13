'use client';

import Link from 'next/link';
import { hasActivePlanAccess, PLAN_PRICING, type PlanInterval } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** Shows an expiring/expired notice for the active owner's plan, if relevant. */
export function PlanStatusBanner() {
  const sub = trpc.billing.getSubscription.useQuery();
  const subscription = sub.data?.subscription;

  if (!subscription || sub.data?.isAdmin) return null;

  const planLabel = PLAN_PRICING[subscription.interval as PlanInterval].label;
  const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const active = hasActivePlanAccess(subscription);

  if (active && periodEnd) {
    const msRemaining = periodEnd.getTime() - Date.now();
    if (msRemaining > THREE_DAYS_MS) return null;

    return (
      <div className="border-b border-gold/40 bg-gold/10 px-4 py-2 text-center text-sm text-foreground sm:px-6 lg:px-10 xl:px-16">
        Your {planLabel} plan ends on {periodEnd.toLocaleDateString()}. Renew any time, it stacks on your
        remaining time.{' '}
        <Link href="/settings/billing" className="font-medium text-primary hover:underline">
          Renew now
        </Link>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-foreground sm:px-6 lg:px-10 xl:px-16">
        Your plan expired{periodEnd ? ` on ${periodEnd.toLocaleDateString()}` : ''}. Reactivate to restore full
        access before your books are removed.{' '}
        <Link href="/settings/billing" className="font-medium text-primary hover:underline">
          Reactivate
        </Link>
      </div>
    );
  }

  return null;
}
