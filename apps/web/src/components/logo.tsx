import { cn } from '@liberscript/ui';

/** Minimal open-book mark, rendered in the current text color. */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M16 7c-4-2-9-2-12-1v18c3-1 8-1 12 1V7Z" fill="currentColor" />
      <path d="M16 7c4-2 9-2 12-1v18c-3-1-8-1-12 1V7Z" fill="currentColor" opacity="0.55" />
      <path d="M16 7v18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** LiberScript wordmark: book mark + display-font name. Pass `iconOnly` for compact headers. */
export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Mark className="h-6 w-6 shrink-0 text-primary" />
      {!iconOnly && (
        <span className="font-display text-lg font-semibold tracking-tight">LiberScript</span>
      )}
    </span>
  );
}
