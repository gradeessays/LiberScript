'use client';

import { useMemo, useState } from 'react';
import { Button, Input } from '@liberscript/ui';
import { hasActivePlanAccess, OwnerType, PLAN_PRICING, type PlanInterval } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const GRANT_OPTIONS: { label: string; days: number }[] = [
  { label: '+1d',   days: 1 },
  { label: '+7d',   days: 7 },
  { label: '+30d',  days: 30 },
  { label: '+1yr',  days: 365 },
];

type FilterMode = 'all' | 'active' | 'inactive';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  TRIALING:  'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  PAST_DUE:  'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  CANCELED:  'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  UNPAID:    'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

function timeRemaining(end: Date | null | undefined): string {
  if (!end) return 'No expiry';
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  if (days >= 365) return `${Math.floor(days / 365)}yr`;
  if (days >= 30)  return `${Math.floor(days / 30)}mo`;
  if (days >= 1)   return `${days}d`;
  const hrs = Math.floor(ms / 3600000);
  return `${hrs}h`;
}

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
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterMode>('all');

  const filtered = useMemo(() => {
    if (!owners.data) return [];
    const q = search.toLowerCase().trim();
    return owners.data
      .filter((o) => {
        if (q && !o.name?.toLowerCase().includes(q) && !o.email?.toLowerCase().includes(q)) return false;
        const active = hasActivePlanAccess(o.subscription);
        if (filter === 'active' && !active) return false;
        if (filter === 'inactive' && active) return false;
        return true;
      })
      .sort((a, b) => {
        // Active first, then by signup date
        const aA = hasActivePlanAccess(a.subscription) ? 1 : 0;
        const bA = hasActivePlanAccess(b.subscription) ? 1 : 0;
        if (bA !== aA) return bA - aA;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [owners.data, search, filter]);

  const activeCount   = owners.data?.filter((o) => hasActivePlanAccess(o.subscription)).length ?? 0;
  const inactiveCount = (owners.data?.length ?? 0) - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grants stack on top of any remaining time and act as a manual override alongside provider billing.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-sm">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {activeCount} active
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {inactiveCount} inactive
          </span>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs"
        />
        <div className="flex gap-1 rounded-md border p-0.5">
          {(['all', 'active', 'inactive'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 text-xs capitalize transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {search && (
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
            Clear
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Expires / renews</th>
              <th className="px-3 py-2">Access</th>
              <th className="px-3 py-2">Grant</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {owners.isLoading ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                  {search || filter !== 'all' ? 'No matching accounts.' : 'No accounts yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const key = `${o.ownerType}:${o.ownerId}`;
                const isPending = (grantAccess.isPending || revokeAccess.isPending) && pendingKey === key;
                const interval = o.subscription?.interval as PlanInterval | null | undefined;
                const access   = hasActivePlanAccess(o.subscription);
                const status   = o.subscription?.status;
                const statusColor = status ? (STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground') : '';
                const remaining = timeRemaining(o.subscription?.currentPeriodEnd);
                return (
                  <tr key={key} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-medium">{o.name}</div>
                      {o.email && <div className="text-xs text-muted-foreground">{o.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {o.ownerType === OwnerType.USER ? 'Personal' : 'Team'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {interval ? PLAN_PRICING[interval].label : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {status ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor}`}>
                          {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {o.subscription?.currentPeriodEnd ? (
                        <span
                          title={new Date(o.subscription.currentPeriodEnd).toLocaleString()}
                          className={remaining === 'Expired' ? 'text-destructive' : 'text-muted-foreground'}
                        >
                          {remaining}
                          <span className="ml-1 text-[10px] opacity-70">
                            ({new Date(o.subscription.currentPeriodEnd).toLocaleDateString()})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
                          if (
                            confirm(
                              `Revoke access for ${o.name}?\n\nThis expires their plan immediately and starts the 7-day deletion countdown for their projects.`,
                            )
                          ) {
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

      {owners.data && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {owners.data.length} accounts.
          {owners.data.length >= 200 && ' (limited to 200 most recent — use search to find others)'}
        </p>
      )}

      {(grantAccess.error || revokeAccess.error) && (
        <p className="text-sm text-destructive">{(grantAccess.error ?? revokeAccess.error)?.message}</p>
      )}
    </div>
  );
}
