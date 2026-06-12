'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

export default function AdminPage() {
  const stats = trpc.admin.stats.useQuery();
  const s = stats.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview. Your account bypasses all plan limits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{s?.users ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{s?.organizations ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active projects</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{s?.projects ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active plans</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{s?.activeSubscriptions ?? '—'}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/subscriptions">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              View every user/team&apos;s plan and manually grant Pro/Team access.
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/payments">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Configure Stripe, PayPal, and Paystack credentials and plan IDs.
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/ai">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>AI Keys</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Manage your own BYO-AI provider keys for personal use.
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/billing">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Billing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your own subscription status and plan.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
