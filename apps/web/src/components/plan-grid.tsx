import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@liberscript/ui';
import { PLAN_PRICING, PlanInterval } from '@liberscript/core';

export const PLAN_ORDER = [PlanInterval.DAY, PlanInterval.WEEK, PlanInterval.MONTH, PlanInterval.YEAR] as const;

export const PLAN_CADENCE: Record<PlanInterval, string> = {
  DAY: 'Full access for 24 hours',
  WEEK: 'Full access for 7 days',
  MONTH: 'Full access for 30 days',
  YEAR: 'Full access for 365 days',
};

export const PLAN_FEATURES = [
  'Unlimited books',
  'All export formats (EPUB, PDF, DOCX)',
  'BYO-AI writing, critique & KDP metadata',
  'Custom fonts & premium themes',
  'No watermark on exports',
  'Unlimited collaborators',
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface PlanGridProps {
  /** Rendered in each card's footer: checkout buttons on the billing page, a plan CTA on /pricing. */
  footer: (interval: PlanInterval) => ReactNode;
  /** Plan to visually highlight, e.g. the most popular option. */
  highlight?: PlanInterval;
}

/** Shared 4-plan grid used by /pricing and /settings/billing, so pricing stays in sync everywhere. */
export function PlanGrid({ footer, highlight }: PlanGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_ORDER.map((interval) => {
        const pricing = PLAN_PRICING[interval];
        const isHighlighted = highlight === interval;
        return (
          <Card key={interval} className={isHighlighted ? 'border-primary ring-1 ring-primary' : ''}>
            <CardHeader>
              {isHighlighted && (
                <span className="mb-1 inline-flex w-fit items-center rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-gold-foreground">
                  Most popular
                </span>
              )}
              <CardTitle>{pricing.label}</CardTitle>
              <p className="font-display text-3xl font-semibold">{formatPrice(pricing.amountCents)}</p>
              <CardDescription>{PLAN_CADENCE[interval]}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {PLAN_FEATURES.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">{footer(interval)}</CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
