'use client';

import Link from 'next/link';
import { Button, cn } from '@liberscript/ui';

interface Props {
  title?: string;
  description: string;
  className?: string;
  compact?: boolean;
}

/**
 * Inline upgrade CTA shown whenever a feature is gated behind Pro.
 * Use `compact` for inline/tight spaces (single line); default for cards.
 */
export function UpgradePrompt({ title, description, className, compact = false }: Props) {
  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Pro</span>
        {description}
        <Link href="/settings/billing" className="font-medium text-primary hover:underline">
          Upgrade
        </Link>
      </span>
    );
  }

  return (
    <div className={cn('rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30', className)}>
      {title && <p className="font-medium text-amber-900 dark:text-amber-200">{title}</p>}
      <p className={cn('text-sm text-amber-800 dark:text-amber-300', title && 'mt-0.5')}>{description}</p>
      <Link href="/settings/billing">
        <Button size="sm" className="mt-3">Upgrade to Pro</Button>
      </Link>
    </div>
  );
}
