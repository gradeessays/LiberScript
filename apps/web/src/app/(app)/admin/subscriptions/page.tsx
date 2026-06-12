'use client';

import { useState } from 'react';
import { Button } from '@liberscript/ui';
import { hasActivePlanAccess, OwnerType, PLAN_PRICING, type PlanInterval } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const GRANT_OPTIONS: { label: string; days: number }[] = [
  { label: '+1d', days: 1 },
  { label: '+7d', days: 7 },
  { label: '+30d', days: 30 },
  { label: '+365d', days: 365 },
];

export default function AdminSubscriptionsPage() {
  const utils = trpc.useUtils();
  const owners = trpc.admin.listOwners.useQuery();
  const grantAccess = trpc.admin.grantAccess.useMutation({
    onSuccess: () => void utils.admin.listOwners.invalidate(),
  });
  const revokeAccess = trpc.admin.revokeAccess.useMutation({
    onSuccess: () => void utils.admin.listOwners.invalidate(),
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every personal and team workspace. Grants stack on top of any remaining time and act as a manual override
          alongside Stripe, PayPal, and Paystack billing.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Renews/expires</th>
              <th className="px-3 py-2">Access</th>
              <th className="px-3 py-2">Grant</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {owners.isLoading ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : (
              owners.data?.map((o) => {
                const key = `${o.ownerType}:${o.ownerId}`;
                const isPending = (grantAccess.isPending || revokeAccess.isPending) && pendingKey === key;
                const interval = o.subscription?.interval as PlanInterval | null | undefined;
                const access = hasActivePlanAccess(o.subscription);
                return (
                  <tr key={key} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{o.name}</div>
                      {o.email && <div className="text-xs text-muted-foreground">{o.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {o.ownerType === OwnerType.USER ? 'Personal' : 'Team'}
                    </td>
                    <td className="px-3 py-2">{interval ? PLAN_PRICING[interval].label : '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{o.subscription?.status ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {o.subscription?.currentPeriodEnd
                        ? new Date(o.subscription.currentPeriodEnd).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          access
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                        }
                      >
                        {access ? 'Active' : 'No access'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {GRANT_OPTIONS.map(({ label, days }) => (
                          <Button
                            key={label}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={isPending}
                            onClick={() => {
                              setPendingKey(key);
                              grantAccess.mutate({ ownerType: o.ownerType, ownerId: o.ownerId, days });
                            }}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        disabled={isPending || !access}
                        onClick={() => {
                          if (confirm(`Revoke access for ${o.name}? This starts the 7-day deletion countdown.`)) {
                            setPendingKey(key);
                            revokeAccess.mutate({ ownerType: o.ownerType, ownerId: o.ownerId });
                          }
                        }}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {(grantAccess.error || revokeAccess.error) && (
        <p className="text-sm text-destructive">{(grantAccess.error ?? revokeAccess.error)?.message}</p>
      )}
    </div>
  );
}
