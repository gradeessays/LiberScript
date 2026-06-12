'use client';

import { useState } from 'react';
import { Button } from '@liberscript/ui';
import { PlanTier, OwnerType } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const TIERS = Object.values(PlanTier);

export default function AdminSubscriptionsPage() {
  const utils = trpc.useUtils();
  const owners = trpc.admin.listOwners.useQuery();
  const setTier = trpc.admin.setTier.useMutation({
    onSuccess: () => void utils.admin.listOwners.invalidate(),
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every personal and team workspace. Tier changes here take effect immediately and act as
          a manual override alongside Paystack billing.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Renews</th>
              <th className="px-3 py-2">Set tier</th>
            </tr>
          </thead>
          <tbody>
            {owners.isLoading ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : (
              owners.data?.map((o) => {
                const key = `${o.ownerType}:${o.ownerId}`;
                const tier = o.subscription?.tier ?? PlanTier.FREE;
                const isPending = setTier.isPending && pendingKey === key;
                return (
                  <tr key={key} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{o.name}</div>
                      {o.email && <div className="text-xs text-muted-foreground">{o.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {o.ownerType === OwnerType.USER ? 'Personal' : 'Team'}
                    </td>
                    <td className="px-3 py-2">{tier}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {o.subscription?.status ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {o.subscription?.currentPeriodEnd
                        ? new Date(o.subscription.currentPeriodEnd).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {TIERS.map((t) => (
                          <Button
                            key={t}
                            size="sm"
                            variant={tier === t ? 'default' : 'outline'}
                            className="h-7 px-2 text-xs"
                            disabled={isPending}
                            onClick={() => {
                              setPendingKey(key);
                              setTier.mutate({ ownerType: o.ownerType, ownerId: o.ownerId, tier: t });
                            }}
                          >
                            {t}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {setTier.error && <p className="text-sm text-destructive">{setTier.error.message}</p>}
    </div>
  );
}
