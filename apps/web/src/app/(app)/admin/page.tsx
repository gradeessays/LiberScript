'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

function pct(n: number | undefined, total: number | undefined): string {
  if (!n || !total) return '—';
  return `${Math.round((n / total) * 100)}%`;
}

export default function AdminPage() {
  const stats = trpc.admin.stats.useQuery();
  const s = stats.data;

  const totalAccounts = (s?.users ?? 0) + (s?.organizations ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview. Your account bypasses all plan limits.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{s?.users ?? '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Personal accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{s?.organizations ?? '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Organization workspaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{s?.projects ?? '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Not archived</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{s?.activeSubscriptions ?? '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pct(s?.activeSubscriptions, totalAccounts)} conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Management</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/subscriptions">
            <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Subscriptions</span>
                  {s?.activeSubscriptions !== undefined && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {s.activeSubscriptions} active
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Grant or revoke access, view plan status, search users by name or email.
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/payments">
            <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Configure Stripe, PayPal, and Paystack credentials and recurring plan IDs.
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings/ai">
            <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
              <CardHeader>
                <CardTitle>AI Keys</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Manage your BYO-AI provider keys (OpenAI, Anthropic, Google) for personal use.
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings/billing">
            <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
              <CardHeader>
                <CardTitle>Billing</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Your own plan status and payment history.
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Ops notes */}
      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Operations notes</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Grants stack on top of remaining time — they don&apos;t reset the clock.</li>
          <li>Revoking access expires the plan immediately and starts a 7-day deletion window.</li>
          <li>After 7 days past expiry the account&apos;s projects are hard-deleted by the nightly cleanup job (3 AM).</li>
          <li>Day and Week pass holders have no recurring subscription — their plan expires automatically.</li>
          <li>Run <code className="font-mono bg-muted px-1 rounded">pnpm ensure-keys</code> on deploy to validate the ENCRYPTION_KEY.</li>
        </ul>
      </div>
    </div>
  );
}
