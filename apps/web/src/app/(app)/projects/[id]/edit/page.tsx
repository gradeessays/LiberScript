'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { JSONContent } from '@tiptap/react';
import {
  ChapterKind,
  KIND_LABELS,
  groupOfKind,
  AUTO_KINDS,
  type SectionGroup,
} from '@liberscript/core';
import dynamic from 'next/dynamic';
import { Button, buttonVariants, cn, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { TitlePageForm } from '@/components/editor/title-page-form';
import { CopyrightForm } from '@/components/editor/copyright-form';

// TipTap is heavy; load it only when the editor is actually shown.
const ManuscriptEditor = dynamic(
  () => import('@/components/editor/manuscript-editor').then((m) => m.ManuscriptEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading editor…</div>
    ),
  },
);

const ADDABLE: ChapterKind[] = [
  ChapterKind.TITLE_PAGE,
  ChapterKind.COPYRIGHT,
  ChapterKind.EPIGRAPH,
  ChapterKind.DEDICATION,
  ChapterKind.TOC,
  ChapterKind.PROLOGUE,
  ChapterKind.INTRODUCTION,
  ChapterKind.PART,
  ChapterKind.ACKNOWLEDGMENTS,
  ChapterKind.ABOUT_AUTHOR,
  ChapterKind.ALSO_BY,
];

const GROUP_TITLES: Record<SectionGroup, string> = {
  front: 'Front matter',
  body: 'Chapters',
  back: 'Back matter',
};

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const project = trpc.project.get.useQuery({ id });
  const elements = useMemo(() => project.data?.manuscript?.chapters ?? [], [project.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  useEffect(() => {
    if (!selectedId && elements[0]) setSelectedId(elements[0].id);
  }, [elements, selectedId]);

  const chapter = trpc.chapter.get.useQuery(
    { id: selectedId ?? '' },
    { enabled: Boolean(selectedId) },
  );

  const refresh = () =>
    Promise.all([utils.project.get.invalidate({ id }), utils.chapter.get.invalidate()]);

  const updateContent = trpc.chapter.updateContent.useMutation();
  const updateMeta = trpc.chapter.updateMeta.useMutation({ onSuccess: refresh });
  const updateData = trpc.chapter.updateData.useMutation({ onSuccess: refresh });
  const create = trpc.chapter.create.useMutation({
    onSuccess: async (c) => {
      await refresh();
      setSelectedId(c.id);
      setAddOpen(false);
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

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  useEffect(() => {
    if (chapter.data) {
      setTitle(chapter.data.title);
      setSubtitle(chapter.data.subtitle ?? '');
    }
  }, [chapter.data]);

  function move(index: number, dir: -1 | 1) {
    const next = [...elements];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate({ projectId: id, orderedIds: next.map((c) => c.id) });
  }

  const groups: SectionGroup[] = ['front', 'body', 'back'];
  let chapterNo = 0;

  const selectedKind = chapter.data?.kind as ChapterKind | undefined;
  const data = (chapter.data?.data ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
            ← {project.data?.title ?? 'Project'}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Book builder</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${id}/design`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Design &amp; preview
          </Link>
          <Button size="sm" onClick={() => create.mutate({ projectId: id, kind: ChapterKind.CHAPTER })}>
            + Chapter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Sectioned outline */}
        <aside className="h-fit space-y-3 rounded-lg border p-2">
          {groups.map((g) => {
            const items = elements.filter((e) => groupOfKind(e.kind as ChapterKind) === g);
            return (
              <div key={g}>
                <div className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_TITLES[g]}
                </div>
                <ul>
                  {items.map((c) => {
                    const globalIndex = elements.findIndex((e) => e.id === c.id);
                    if (c.kind === ChapterKind.CHAPTER) chapterNo += 1;
                    const label =
                      c.kind === ChapterKind.CHAPTER
                        ? `${chapterNo}. ${c.title}`
                        : KIND_LABELS[c.kind as ChapterKind] ?? c.title;
                    return (
                      <li
                        key={c.id}
                        className={cn(
                          'flex items-center gap-1 rounded px-2 py-1.5 text-sm',
                          c.id === selectedId && 'bg-accent',
                        )}
                      >
                        <button
                          className="flex-1 truncate text-left"
                          onClick={() => setSelectedId(c.id)}
                          title={c.title}
                        >
                          {label}
                        </button>
                        <button
                          className="px-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={globalIndex === 0}
                          onClick={() => move(globalIndex, -1)}
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          className="px-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={globalIndex === elements.length - 1}
                          onClick={() => move(globalIndex, 1)}
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Add element */}
          <div className="relative px-1">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAddOpen((o) => !o)}>
              + Add element
            </Button>
            {addOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-background p-1 shadow-md">
                {ADDABLE.map((k) => (
                  <button
                    key={k}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => create.mutate({ projectId: id, kind: k })}
                  >
                    {KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Editing pane */}
        <section className="space-y-3">
          {!selectedId || !chapter.data ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              Select an element, add a chapter, or build your front matter.
            </div>
          ) : (
            <>
              {/* Actions — available for every element kind */}
              <div className="flex items-center justify-between rounded-lg border p-2">
                <span className="text-sm font-medium">
                  {KIND_LABELS[selectedKind as ChapterKind] ?? 'Element'}
                </span>
                <div className="flex gap-2">
                  {selectedKind === ChapterKind.CHAPTER && (
                    <Button variant="ghost" size="sm" onClick={() => mergeUp.mutate({ id: selectedId })}>
                      Merge into previous
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm('Delete this element?')) removeChapter.mutate({ id: selectedId });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {AUTO_KINDS.includes(selectedKind as ChapterKind) ? (
                <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Table of Contents</p>
                  Auto-generated from your parts and chapters. It updates as you add or rename
                  chapters — no editing needed.
                </div>
              ) : selectedKind === ChapterKind.TITLE_PAGE ? (
                <TitlePageForm data={data} onSave={(d) => updateData.mutate({ id: selectedId, data: d })} />
              ) : selectedKind === ChapterKind.COPYRIGHT ? (
                <CopyrightForm
                  bookTitle={project.data?.title ?? ''}
                  data={data}
                  onSave={(d) => updateData.mutate({ id: selectedId, data: d })}
                />
              ) : (
                <>
                  <div className="space-y-2 rounded-lg border p-3">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => title.trim() && updateMeta.mutate({ id: selectedId, title, subtitle })}
                      className="text-lg font-semibold"
                      placeholder="Title"
                    />
                    {selectedKind === ChapterKind.CHAPTER && (
                      <Input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        onBlur={() =>
                          updateMeta.mutate({ id: selectedId, title, subtitle: subtitle || null })
                        }
                        placeholder="Subtitle (optional)"
                      />
                    )}
                    {selectedKind === ChapterKind.EPIGRAPH && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>Attribution</Label>
                          <Input
                            defaultValue={(data.attribution as string) ?? ''}
                            onBlur={(e) =>
                              updateData.mutate({
                                id: selectedId,
                                data: { ...data, attribution: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Style</Label>
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                            defaultValue={(data.style as string) ?? 'centered'}
                            onChange={(e) =>
                              updateData.mutate({
                                id: selectedId,
                                data: { ...data, style: e.target.value },
                              })
                            }
                          >
                            <option value="centered">Centered italic</option>
                            <option value="bordered">Rule-bordered</option>
                            <option value="large">Large quote</option>
                            <option value="plain">Plain</option>
                          </select>
                        </div>
                      </div>
                    )}
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
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
