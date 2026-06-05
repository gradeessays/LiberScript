'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { JSONContent } from '@tiptap/react';
import { Button, buttonVariants, cn, Input } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { ManuscriptEditor } from '@/components/editor/manuscript-editor';

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const project = trpc.project.get.useQuery({ id });
  const chapters = project.data?.manuscript?.chapters ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && chapters[0]) setSelectedId(chapters[0].id);
  }, [chapters, selectedId]);

  const chapter = trpc.chapter.get.useQuery(
    { id: selectedId ?? '' },
    { enabled: Boolean(selectedId) },
  );

  const refresh = async () => {
    await Promise.all([utils.project.get.invalidate({ id }), utils.chapter.get.invalidate()]);
  };

  const updateContent = trpc.chapter.updateContent.useMutation();
  const updateMeta = trpc.chapter.updateMeta.useMutation({ onSuccess: refresh });
  const createChapter = trpc.chapter.create.useMutation({
    onSuccess: async (c) => {
      await refresh();
      setSelectedId(c.id);
    },
  });
  const removeChapter = trpc.chapter.remove.useMutation({ onSuccess: refresh });
  const reorder = trpc.chapter.reorder.useMutation({ onSuccess: refresh });
  const split = trpc.chapter.split.useMutation({
    onSuccess: async (c) => {
      await refresh();
      setSelectedId(c.id);
    },
  });
  const mergeUp = trpc.chapter.mergeUp.useMutation({
    onSuccess: async (r) => {
      await refresh();
      setSelectedId(r.mergedIntoId);
    },
  });

  // Chapter meta (title/subtitle) local form, synced when the chapter loads.
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  useEffect(() => {
    if (chapter.data) {
      setTitle(chapter.data.title);
      setSubtitle(chapter.data.subtitle ?? '');
    }
  }, [chapter.data]);

  function move(index: number, dir: -1 | 1) {
    const next = [...chapters];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate({ projectId: id, orderedIds: next.map((c) => c.id) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
            ← {project.data?.title ?? 'Project'}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Editor</h1>
        </div>
        <Button size="sm" onClick={() => createChapter.mutate({ projectId: id })}>
          + Add chapter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        {/* Chapter list */}
        <aside className="h-fit rounded-lg border">
          {chapters.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No chapters yet. Upload a manuscript or add one.
            </p>
          ) : (
            <ul className="divide-y">
              {chapters.map((c, i) => (
                <li
                  key={c.id}
                  className={cn(
                    'flex items-center gap-1 px-2 py-2 text-sm',
                    c.id === selectedId && 'bg-accent',
                  )}
                >
                  <button
                    className="flex-1 truncate text-left"
                    onClick={() => setSelectedId(c.id)}
                    title={c.title}
                  >
                    <span className="text-muted-foreground">{i + 1}.</span> {c.title}
                    {c.subtitle && <span className="text-muted-foreground"> — {c.subtitle}</span>}
                  </button>
                  <button
                    className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={i === chapters.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Editing pane */}
        <section className="space-y-3">
          {selectedId && chapter.data ? (
            <>
              <div className="space-y-2 rounded-lg border p-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title.trim() && updateMeta.mutate({ id: selectedId, title, subtitle })}
                  className="text-lg font-semibold"
                  placeholder="Chapter title"
                />
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  onBlur={() =>
                    updateMeta.mutate({ id: selectedId, title, subtitle: subtitle || null })
                  }
                  placeholder="Subtitle (optional)"
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => mergeUp.mutate({ id: selectedId })}
                    disabled={chapters.findIndex((c) => c.id === selectedId) === 0}
                  >
                    Merge into previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this chapter?')) removeChapter.mutate({ id: selectedId });
                    }}
                  >
                    Delete chapter
                  </Button>
                </div>
              </div>

              <ManuscriptEditor
                key={selectedId}
                initialContent={chapter.data.content as JSONContent}
                onSave={async (content) => {
                  await updateContent.mutateAsync({ id: selectedId, content });
                }}
                onSplit={(before, after) =>
                  split.mutate({ id: selectedId, before, after, newTitle: 'Untitled chapter' })
                }
              />
            </>
          ) : (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              {chapters.length > 0 ? 'Select a chapter to edit.' : 'Add a chapter to start writing.'}
              <div className="mt-3">
                <Link href={`/projects/${id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Back to project
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
