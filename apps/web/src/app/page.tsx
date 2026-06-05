'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

export default function HomePage() {
  const health = trpc.health.status.useQuery(undefined, { refetchInterval: 10_000 });
  const ping = trpc.health.ping.useMutation();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Liberscript</h1>
          <p className="text-muted-foreground">
            Write, analyze, format, and export your book — all under one roof.
          </p>
        </div>
        <nav className="flex shrink-0 items-center gap-2">
          <Link href="/sign-in" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: 'sm' })}>
            Get started
          </Link>
        </nav>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">System health</h2>
        {health.isLoading ? (
          <p className="text-muted-foreground">Checking…</p>
        ) : health.data ? (
          <ul className="space-y-1 text-sm">
            <li>
              Overall:{' '}
              <span className={health.data.healthy ? 'text-green-600' : 'text-destructive'}>
                {health.data.healthy ? 'healthy' : 'degraded'}
              </span>
            </li>
            {Object.entries(health.data.checks).map(([name, state]) => (
              <li key={name}>
                {name}:{' '}
                <span className={state === 'ok' ? 'text-green-600' : 'text-destructive'}>
                  {state}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-destructive">Health check failed.</p>
        )}
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">Worker smoke test</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Enqueue a ping job for the background worker to process.
        </p>
        <Button onClick={() => ping.mutate({ message: 'ping' })} disabled={ping.isPending}>
          {ping.isPending ? 'Enqueuing…' : 'Send ping'}
        </Button>
        {ping.data?.jobId && (
          <p className="mt-3 text-sm text-green-600">Queued job #{ping.data.jobId}</p>
        )}
        {ping.error && <p className="mt-3 text-sm text-destructive">{ping.error.message}</p>}
      </section>
    </main>
  );
}
