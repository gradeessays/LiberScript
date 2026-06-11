'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, cn } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

/** Header dropdown: switch between books, or start a new one. */
export function ProjectSwitcher({ currentId, currentTitle }: { currentId: string; currentTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const projects = trpc.project.list.useQuery(undefined, { enabled: open });
  const create = trpc.project.create.useMutation({
    onSuccess: (p) => {
      setOpen(false);
      router.push(`/projects/${p.id}/edit`);
    },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[14rem] items-center gap-1 rounded-md border px-2 py-1 text-sm hover:bg-accent"
        title={currentTitle}
      >
        <span className="truncate font-medium">{currentTitle}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute z-20 mt-1 w-72 rounded-md border bg-background p-1 shadow-md">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Your books</span>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="text-[11px] text-primary hover:underline"
              >
                All books →
              </Link>
            </div>
            <ul className="max-h-72 overflow-auto">
              {projects.isLoading ? (
                <li className="px-2 py-2 text-sm text-muted-foreground">Loading…</li>
              ) : (
                (projects.data ?? []).map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        if (p.id !== currentId) router.push(`/projects/${p.id}/edit`);
                      }}
                      className={cn(
                        'block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent',
                        p.id === currentId && 'bg-accent font-medium',
                      )}
                    >
                      {p.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-1 border-t pt-1">
              <Button
                size="sm"
                className="w-full"
                disabled={create.isPending}
                onClick={() => create.mutate({ title: 'Untitled book' })}
              >
                {create.isPending ? 'Creating…' : '+ New book'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
