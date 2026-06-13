import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonVariants, cn } from '@liberscript/ui';
import { PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { PlanGrid } from '@/components/plan-grid';

export const metadata: Metadata = {
  title: 'Pricing | LiberScript',
  description:
    'Simple, fixed-price passes for the LiberScript book studio. No subscriptions, no auto-renewal, and every plan unlocks the full toolkit.',
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple, pass-based pricing
        </h1>
        <p className="mt-4 text-muted-foreground">
          No subscriptions. No auto-renewal. Buy a pass for the time you need, and every plan unlocks the entire
          LiberScript toolkit: writing, critique, design, and export. When you&apos;re ready for more time, buy
          another pass and it stacks on top of what you have left.
        </p>
      </div>

      <div className="mt-12">
        <PlanGrid
          highlight={PlanInterval.MONTH}
          footer={(interval) => (
            <Link
              href={`/get-started?plan=${interval}`}
              className={cn(buttonVariants({ className: 'w-full' }))}
            >
              Choose {PLAN_PRICING[interval].label}
            </Link>
          )}
        />
      </div>

      <div className="mx-auto mt-16 max-w-2xl space-y-6 text-sm text-muted-foreground">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">How passes work</h2>
          <p className="mt-2">
            Each plan is a fixed-price pass for a fixed amount of time: a day, a week, a month, or a year. There
            is no recurring billing and nothing to cancel. When your pass is close to running out, you&apos;ll see
            a reminder in your dashboard with a link back here. If you buy a new pass before your current one
            ends, the extra time is added to what you already have.
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Not sure where to start?</h2>
          <p className="mt-2">
            The Day pass is a great way to try the full editor, critique engine, and export pipeline on your own
            manuscript before committing to a longer plan. Most authors who are actively drafting or formatting a
            book choose the Monthly plan, and the Annual plan is the best value if you plan to use LiberScript for
            multiple projects over the year.
          </p>
        </div>
        <div className="pt-2 text-center">
          <Link href="/get-started" className={buttonVariants({ size: 'lg' })}>
            Get started
          </Link>
        </div>
      </div>
    </div>
  );
}
