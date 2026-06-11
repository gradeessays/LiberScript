'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { DashboardUpload } from '@/components/dashboard-upload';

function relativeDate(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const h = diff / 3_600_000;
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.floor(h)}h ago`;
  const days = h / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** All-books library. Replaces the old redirect-to-latest behaviour. */
export default function DashboardPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const projects = trpc.project.list.useQuery();
  const [title, setTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const create = trpc.project.create.useMutation({
    onSuccess: (p) => router.push(`/projects/${p.id}/edit`),
  });
  const archive = trpc.project.archive.useMutation({
    onSuccess: () => {
      setConfirmDelete(null);
      void utils.project.list.invalidate();
    },
  });
  const rename = trpc.project.rename.useMutation({
    onSuccess: () => {
      setRenamingId(null);
      void utils.project.list.invalidate();
    },
  });

  if (projects.isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading your library…</p>;
  }

  const list = projects.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your books</h1>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ title: title.trim() || 'Untitled book' });
          }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New book title…"
            maxLength={200}
            className="w-52"
          />
          <Button type="submit" size="sm" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : '+ New book'}
          </Button>
        </form>
      </div>

      {create.error && (
        <p className="text-sm text-destructive">{create.error.message}</p>
      )}

      {/* Book grid */}
      {list.length === 0 ? (
        <div className="space-y-6 py-8 text-center">
          <p className="text-muted-foreground">
            You haven&apos;t created any books yet. Start from scratch or import a manuscript below.
          </p>
          <div className="mx-auto max-w-sm">
            <DashboardUpload />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((p) => {
              const words = p.manuscript?.wordCount ?? 0;
              const isDeleting = confirmDelete === p.id;
              const isRenaming = renamingId === p.id;

              return (
                <Card key={p.id} className="group flex flex-col">
                  <CardHeader className="pb-2">
                    {isRenaming ? (
                      <form
                        className="flex gap-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (renameValue.trim()) {
                            rename.mutate({ id: p.id, title: renameValue.trim() });
                          }
                        }}
                      >
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          maxLength={200}
                          className="h-7 text-sm"
                          onKeyDown={(e) => e.key === 'Escape' && setRenamingId(null)}
                        />
                        <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={rename.isPending}>
                          Save
                        </Button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="px-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      </form>
                    ) : (
                      <CardTitle
                        className="cursor-pointer truncate text-base leading-snug hover:text-primary"
                        title={`${p.title} — click to rename`}
                        onClick={() => {
                          setRenamingId(p.id);
                          setRenameValue(p.title);
                        }}
                      >
                        {p.title}
                      </CardTitle>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {words > 0 ? `${words.toLocaleString()} words · ` : ''}
                      Updated {relativeDate(p.updatedAt)}
                    </p>
                  </CardHeader>

                  <CardContent className="mt-auto flex items-center justify-between gap-2 pt-0">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/projects/${p.id}/edit`)}
                    >
                      Open
                    </Button>

                    {isDeleting ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-2 text-xs"
                          disabled={archive.isPending}
                          onClick={() => archive.mutate({ id: p.id })}
                        >
                          {archive.isPending ? '…' : 'Delete'}
                        </Button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        className="rounded p-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        title="Delete book"
                        aria-label="Delete book"
                      >
                        🗑
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick upload at the bottom */}
          <div className="border-t pt-6">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Import a manuscript</p>
            <DashboardUpload />
          </div>
        </>
      )}
    </div>
  );
}
