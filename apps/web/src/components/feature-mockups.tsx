import type { ReactNode } from 'react';
import { cn } from '@liberscript/ui';

/**
 * Decorative, CSS-built stand-ins for product screenshots on the marketing
 * home page. Each renders inside the same aspect-[4/3] frame the old
 * ScreenshotPlaceholder used, with the descriptive label exposed to screen
 * readers via role="img" instead of as visible text.
 */
function MockupFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className="aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/40">
      <div aria-hidden="true" className="h-full w-full">
        {children}
      </div>
    </div>
  );
}

const PART_ONE_CHAPTERS = ['Prologue', 'Chapter 1', 'Chapter 2', 'Chapter 3'];
const PART_TWO_CHAPTERS = ['Chapter 4', 'Chapter 5'];
const CHAPTER_BODY_LINES = [100, 92, 97, 88, 60, 100, 95, 90, 70];

export function ManuscriptEditorMockup({ label }: { label: string }) {
  return (
    <MockupFrame label={label}>
      <div className="flex h-full text-[11px] leading-none">
        <div className="w-2/5 shrink-0 border-r bg-background/70 p-3">
          <p className="px-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Part One</p>
          <div className="mt-1.5 space-y-0.5">
            {PART_ONE_CHAPTERS.map((title, idx) => (
              <div
                key={title}
                className={cn(
                  'rounded px-2 py-1.5',
                  idx === 2 ? 'bg-primary/10 font-medium text-primary' : 'text-foreground/70',
                )}
              >
                {title}
              </div>
            ))}
          </div>
          <p className="mt-3 px-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Part Two</p>
          <div className="mt-1.5 space-y-0.5">
            {PART_TWO_CHAPTERS.map((title) => (
              <div key={title} className="rounded px-2 py-1.5 text-foreground/70">
                {title}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-background p-4">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Chapter 2</p>
          <p className="mt-1 font-display text-sm font-semibold">A Door Left Open</p>
          <div className="mt-3 space-y-1.5">
            {CHAPTER_BODY_LINES.map((width, idx) => (
              <div key={idx} className="h-1.5 rounded bg-foreground/10" style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

const CRITIQUE_ROWS = [
  { name: 'Chapter 1', tags: [{ label: 'Pacing', good: true }] },
  {
    name: 'Chapter 2',
    tags: [
      { label: 'Adverbs', good: false },
      { label: 'Passive voice', good: false },
    ],
  },
  { name: 'Chapter 3', tags: [{ label: 'Filler words', good: false }] },
  {
    name: 'Chapter 4',
    tags: [
      { label: 'Pacing', good: false },
      { label: 'Clichés', good: false },
    ],
  },
  { name: 'Chapter 5', tags: [{ label: 'Dialogue', good: true }] },
] as const;

export function CritiqueReportMockup({ label }: { label: string }) {
  return (
    <MockupFrame label={label}>
      <div className="flex h-full flex-col bg-background p-4 text-[11px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-semibold">Critique report</p>
            <p className="text-[9px] text-muted-foreground">5 chapters analyzed</p>
          </div>
          <div className="flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 border-gold">
            <span className="font-display text-sm font-semibold leading-none">82</span>
            <span className="text-[7px] uppercase tracking-wide text-muted-foreground">score</span>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {CRITIQUE_ROWS.map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1.5">
              <span className="font-medium">{row.name}</span>
              <div className="flex gap-1">
                {row.tags.map((tag) => (
                  <span
                    key={tag.label}
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[8px] font-medium',
                      tag.good ? 'bg-primary/10 text-primary' : 'bg-gold/20 text-gold-foreground',
                    )}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MockupFrame>
  );
}

const LEFT_PAGE_LINES = [100, 96, 92, 98, 88, 94, 60, 100, 90];
const RIGHT_PAGE_LINES = [90, 100, 95, 85, 92, 70, 100];

export function PrintPreviewMockup({ label }: { label: string }) {
  return (
    <MockupFrame label={label}>
      <div className="flex h-full items-center justify-center gap-3 p-4">
        <div className="flex h-full w-1/2 flex-col rounded-sm border bg-background p-3 shadow-sm">
          <p className="text-center text-[8px] uppercase tracking-widest text-muted-foreground">The Long Way Home</p>
          <div className="mt-3 flex-1 space-y-1.5">
            {LEFT_PAGE_LINES.map((width, idx) => (
              <div key={idx} className="h-1 rounded bg-foreground/10" style={{ width: `${width}%` }} />
            ))}
          </div>
          <p className="text-center text-[8px] text-muted-foreground">42</p>
        </div>
        <div className="flex h-full w-1/2 flex-col rounded-sm border bg-background p-3 shadow-sm">
          <p className="text-center text-[8px] uppercase tracking-widest text-muted-foreground">Chapter Seven</p>
          <p className="mt-1 text-center font-display text-xs font-semibold">A Door Left Open</p>
          <div className="mt-3 flex-1 space-y-1.5">
            {RIGHT_PAGE_LINES.map((width, idx) => (
              <div key={idx} className="h-1 rounded bg-foreground/10" style={{ width: `${width}%` }} />
            ))}
          </div>
          <p className="text-center text-[8px] text-muted-foreground">43</p>
        </div>
      </div>
    </MockupFrame>
  );
}
