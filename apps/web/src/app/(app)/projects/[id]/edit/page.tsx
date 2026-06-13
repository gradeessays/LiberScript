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
import { Button, cn, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { TitlePageForm } from '@/components/editor/title-page-form';
import { CopyrightForm } from '@/components/editor/copyright-form';
import { DesignStudio } from '@/components/design-studio';
import { ProjectSwitcher } from '@/components/project-switcher';
import { EditorUpload } from '@/components/editor-upload';
import { CritiquePanel } from '@/components/critique-panel';
import { GenerateBookModal } from '@/components/editor/generate-book-modal';

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
  ChapterKind.FOREWORD,
  ChapterKind.PREFACE,
  ChapterKind.PROLOGUE,
  ChapterKind.INTRODUCTION,
  ChapterKind.CHAPTER,
  ChapterKind.PART,
  ChapterKind.EPILOGUE,
  ChapterKind.AFTERWORD,
  ChapterKind.ACKNOWLEDGMENTS,
  ChapterKind.ABOUT_AUTHOR,
  ChapterKind.ALSO_BY,
  ChapterKind.APPENDIX,
];

const GROUP_TITLES: Record<SectionGroup, string> = {
  front: 'Front matter',
  body: 'Chapters',
  back: 'Back matter',
};

const GROUP_RANK: Record<SectionGroup, number> = { front: 0, body: 1, back: 2 };

// Narrative sections that support an optional opening quote (+ attribution).
const OPENING_QUOTE_KINDS: ChapterKind[] = [
  ChapterKind.CHAPTER,
  ChapterKind.PROLOGUE,
  ChapterKind.INTRODUCTION,
  ChapterKind.FOREWORD,
  ChapterKind.PREFACE,
  ChapterKind.EPILOGUE,
  ChapterKind.AFTERWORD,
];
// Sections that support an optional subtitle (the above + parts).
const SUBTITLE_KINDS: ChapterKind[] = [...OPENING_QUOTE_KINDS, ChapterKind.PART];
// Kinds where the big title line doesn't apply (their heading is fixed/none).
const NO_TITLE_KINDS: ChapterKind[] = [ChapterKind.EPIGRAPH, ChapterKind.DEDICATION];

// The renderer/exporter automatically prefix attributions with "— ", so strip
// any dash/tilde the author types so the stored value stays a plain name.
const ATTRIBUTION_PREFIX_RE = /^\s*[-‐-―~]+\s*/;
function normalizeAttribution(raw: string): string {
  return raw.replace(ATTRIBUTION_PREFIX_RE, '');
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const project = trpc.project.get.useQuery({ id });
  const elements = useMemo(() => project.data?.manuscript?.chapters ?? [], [project.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addGroup, setAddGroup] = useState<SectionGroup | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Optimistic placeholders carry a `temp-` id until the server returns the real
  // one; never auto-select or fetch those (they don't exist server-side yet).
  const isTempId = (x: string | null | undefined) => !!x && x.startsWith('temp-');
  useEffect(() => {
    const first = elements.find((e) => !isTempId(e.id));
    if (!selectedId && first) setSelectedId(first.id);
  }, [elements, selectedId]);

  const chapter = trpc.chapter.get.useQuery(
    { id: selectedId ?? '' },
    { enabled: Boolean(selectedId) && !isTempId(selectedId) },
  );

  // Also invalidate the Preview tab's data so title/subtitle/opening-quote/
  // attribution/section-type/order changes made here show up immediately
  // when switching to Preview, instead of waiting out previewData's 30s
  // staleTime.
  const refresh = () =>
    Promise.all([
      utils.project.get.invalidate({ id }),
      utils.chapter.get.invalidate(),
      utils.formatting.previewData.invalidate({ projectId: id }),
    ]);
  // Worker parsing is async; refresh on a widening schedule so new sections
  // appear live even when the worker is cold or the file is large.
  const refreshSoon = () => {
    void refresh();
    for (const ms of [2000, 5000, 10000, 20000]) setTimeout(() => void refresh(), ms);
  };

  const updateContent = trpc.chapter.updateContent.useMutation();
  const updateMeta = trpc.chapter.updateMeta.useMutation({ onSuccess: refresh });
  const updateData = trpc.chapter.updateData.useMutation({ onSuccess: refresh });
  const updateKind = trpc.chapter.updateKind.useMutation({ onSuccess: refresh });
  // Optimistic add: the new element appears instantly in its correct group
  // (front → body → back), mirroring the server's regrouping.
  const create = trpc.chapter.create.useMutation({
    onMutate: async (vars) => {
      const kind = vars.kind ?? ChapterKind.CHAPTER;
      setAddGroup(null);
      await utils.project.get.cancel({ id });
      const prev = utils.project.get.getData({ id });
      utils.project.get.setData({ id }, (old) => {
        if (!old?.manuscript) return old;
        const rank = (k: ChapterKind) => GROUP_RANK[groupOfKind(k)] ?? 1;
        const placeholder = {
          id: `temp-${Date.now()}`,
          kind,
          title: kind === ChapterKind.CHAPTER ? 'New chapter' : KIND_LABELS[kind],
          subtitle: null,
          order: 0,
          wordCount: 0,
        };
        const chapters = [...old.manuscript.chapters];
        let insertAt = chapters.length;
        for (let i = chapters.length - 1; i >= 0; i -= 1) {
          if (rank(chapters[i]!.kind as ChapterKind) <= rank(kind)) {
            insertAt = i + 1;
            break;
          }
          insertAt = i;
        }
        chapters.splice(insertAt, 0, placeholder);
        return { ...old, manuscript: { ...old.manuscript, chapters } };
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) utils.project.get.setData({ id }, ctx.prev);
      setActionError(`Couldn't add the element: ${err.message}. Please try again.`);
    },
    onSuccess: (c) => {
      setActionError(null);
      setSelectedId(c.id);
    },
    onSettled: refresh,
  });
  // Optimistic: the element leaves the outline the instant you confirm.
  const removeChapter = trpc.chapter.remove.useMutation({
    onMutate: async ({ id: chapterId }) => {
      await utils.project.get.cancel({ id });
      const prev = utils.project.get.getData({ id });
      utils.project.get.setData({ id }, (old) =>
        old?.manuscript
          ? {
              ...old,
              manuscript: {
                ...old.manuscript,
                chapters: old.manuscript.chapters.filter((c) => c.id !== chapterId),
              },
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && utils.project.get.setData({ id }, ctx.prev),
    onSettled: refresh,
  });
  // Optimistic: the outline re-orders immediately on ↑/↓.
  const reorder = trpc.chapter.reorder.useMutation({
    onMutate: async ({ orderedIds }) => {
      await utils.project.get.cancel({ id });
      const prev = utils.project.get.getData({ id });
      utils.project.get.setData({ id }, (old) => {
        if (!old?.manuscript) return old;
        const byId = new Map(old.manuscript.chapters.map((c) => [c.id, c]));
        const chapters = orderedIds.flatMap((cid) => {
          const c = byId.get(cid);
          return c ? [c] : [];
        });
        return { ...old, manuscript: { ...old.manuscript, chapters } };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && utils.project.get.setData({ id }, ctx.prev),
    onSettled: refresh,
  });
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

  const aiStatus = trpc.ai.status.useQuery();

  const [view, setView] = useState<'write' | 'critique' | 'preview'>('write');
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [openingQuote, setOpeningQuote] = useState('');
  const [openingAttr, setOpeningAttr] = useState('');
  useEffect(() => {
    if (chapter.data) {
      setTitle(chapter.data.title);
      setSubtitle(chapter.data.subtitle ?? '');
      const d = (chapter.data.data ?? {}) as Record<string, unknown>;
      setOpeningQuote((d.openingQuote as string) ?? '');
      setOpeningAttr((d.openingQuoteAttribution as string) ?? '');
    }
  }, [chapter.data]);

  function saveOpening(quote: string, attr: string) {
    if (!selectedId) return;
    const cleanAttr = normalizeAttribution(attr);
    if (cleanAttr !== attr) setOpeningAttr(cleanAttr);
    updateData.mutate({
      id: selectedId,
      data: { ...data, openingQuote: quote || undefined, openingQuoteAttribution: cleanAttr || undefined },
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...elements];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate({ projectId: id, orderedIds: next.map((c) => c.id) });
  }

  const [dragId, setDragId] = useState<string | null>(null);
  // Drag a section onto another to reorder. Moves are confined to the same group
  // (front/body/back) so the structure stays valid; the order applies instantly.
  function dropOn(targetId: string) {
    const src = elements.find((e) => e.id === dragId);
    const tgt = elements.find((e) => e.id === targetId);
    setDragId(null);
    if (!src || !tgt || src.id === tgt.id) return;
    if (groupOfKind(src.kind as ChapterKind) !== groupOfKind(tgt.kind as ChapterKind)) return;
    const ids = elements.map((e) => e.id).filter((x) => x !== src.id);
    const at = ids.indexOf(targetId);
    ids.splice(at, 0, src.id);
    reorder.mutate({ projectId: id, orderedIds: ids });
  }

  const groups: SectionGroup[] = ['front', 'body', 'back'];
  let chapterNo = 0;

  const selectedKind = chapter.data?.kind as ChapterKind | undefined;
  const data = (chapter.data?.data ?? {}) as Record<string, unknown>;
  // Label for the loading state, taken from the outline (avoids a blank pane).
  const selectedOutline = elements.find((e) => e.id === selectedId);
  const selectedLabel = selectedOutline
    ? KIND_LABELS[selectedOutline.kind as ChapterKind] ?? 'element'
    : 'element';

  return (
    <div className="space-y-4">
      {/* Sub-nav: sticks just below the app header (top-14 = 56 px). Bleeds
          edge-to-edge by reversing the layout's horizontal padding. */}
      <div className="sticky top-14 z-30 -mx-4 flex items-center gap-3 border-b bg-background/95 px-4 py-1.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 xl:-mx-16 xl:px-16">
        {/* Book identity */}
        <ProjectSwitcher currentId={id} currentTitle={project.data?.title ?? 'Untitled book'} />
        <Link href={`/projects/${id}/cover`} className="hidden text-xs text-muted-foreground hover:text-foreground sm:block">
          Cover
        </Link>
        {project.data?.manuscript && project.data.manuscript.wordCount > 0 && (
          <span className="hidden text-[11px] text-muted-foreground/70 lg:block" title="Total words · estimated reading time">
            {project.data.manuscript.wordCount.toLocaleString()} w · {project.data.manuscript.readingMinutes} min
          </span>
        )}

        {/* View switcher — centred in the remaining space */}
        <div className="mx-auto flex rounded-md border p-0.5 text-xs">
          {(['write', 'critique', 'preview'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded px-2.5 py-1 capitalize',
                view === v ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v === 'preview' ? 'Preview' : v}
            </button>
          ))}
        </div>

        {/* Contextual actions (write mode only) */}
        {view === 'write' && <EditorUpload projectId={id} onParsed={refreshSoon} />}
        {view === 'write' && aiStatus.data?.enabled && aiStatus.data?.hasKey && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => setGenerateModalOpen(true)}
          >
            ✦ Generate
          </Button>
        )}
        {view === 'write' && (
          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => create.mutate({ projectId: id, kind: ChapterKind.CHAPTER })}>
            + Chapter
          </Button>
        )}
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span>{actionError}</span>
          <button className="shrink-0 font-medium hover:underline" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* All three panels are always mounted — only visibility toggles via `hidden`.
          This keeps DesignStudio and CritiquePanel state alive across view switches. */}
      <div className={view !== 'preview' ? 'hidden' : ''}>
        <DesignStudio projectId={id} embedded />
      </div>
      <div className={view !== 'critique' ? 'hidden' : ''}>
        <CritiquePanel projectId={id} />
      </div>
      <div className={view !== 'write' ? 'hidden' : ''}>
      <div className="grid gap-4 items-start md:grid-cols-[280px_1fr]">
        {/* Sectioned outline — sticky so it stays visible while scrolling the editor */}
        <aside className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-3 overflow-y-auto rounded-lg border p-2 [scrollbar-width:thin]">
          {groups.map((g) => {
            const items = elements.filter((e) => groupOfKind(e.kind as ChapterKind) === g);
            const addable = ADDABLE.filter((k) => groupOfKind(k) === g);
            return (
              <div key={g}>
                {/* Group header — click + to add an element of this group */}
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {GROUP_TITLES[g]}
                    {items.length > 0 && <span className="ml-1 font-normal">({items.length})</span>}
                  </span>
                  <div className="relative">
                    <button
                      className="rounded px-1.5 text-base leading-none text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => setAddGroup(addGroup === g ? null : g)}
                      aria-label={`Add to ${GROUP_TITLES[g]}`}
                      title={`Add to ${GROUP_TITLES[g]}`}
                    >
                      +
                    </button>
                    {addGroup === g && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setAddGroup(null)} aria-hidden />
                        <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border bg-background p-1 shadow-md">
                          {addable.map((k) => (
                            <button
                              key={k}
                              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                              onClick={() => create.mutate({ projectId: id, kind: k })}
                            >
                              {KIND_LABELS[k]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {items.length === 0 ? (
                  <button
                    onClick={() => setAddGroup(g)}
                    className="w-full rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
                  >
                    + Add {GROUP_TITLES[g].toLowerCase()}…
                  </button>
                ) : (
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
                          draggable
                          onDragStart={() => setDragId(c.id)}
                          onDragOver={(e) => dragId && dragId !== c.id && e.preventDefault()}
                          onDrop={() => dropOn(c.id)}
                          className={cn(
                            'group flex items-center gap-1 rounded px-2 py-1.5 text-sm',
                            c.id === selectedId && 'bg-accent',
                            dragId === c.id && 'opacity-40',
                            dragId && dragId !== c.id && 'hover:ring-1 hover:ring-primary',
                          )}
                        >
                          <span className="cursor-grab select-none text-muted-foreground" aria-hidden>
                            ⋮⋮
                          </span>
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
                          <button
                            className="px-1 text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                            onClick={() => {
                              if (confirm(`Delete “${label}”?`)) {
                                removeChapter.mutate({ id: c.id });
                                if (selectedId === c.id) setSelectedId(null);
                              }
                            }}
                            aria-label="Delete"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </aside>

        {/* Editing pane */}
        <section className="space-y-3">
          {!selectedId ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              Select an element on the left, or add one with the <strong>+</strong> next to a group.
            </div>
          ) : chapter.isLoading ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              Loading {selectedLabel}…
            </div>
          ) : !chapter.data ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              Couldn&apos;t load this element.{' '}
              <button className="text-primary hover:underline" onClick={() => chapter.refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Actions — available for every element kind. The type selector is a
                  real-time override of the upload auto-detection. */}
              <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Section type
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                    value={selectedKind ?? ChapterKind.CHAPTER}
                    disabled={updateKind.isPending}
                    onChange={(e) =>
                      updateKind.mutate({ id: selectedId, kind: e.target.value as ChapterKind })
                    }
                  >
                    {ADDABLE.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
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
                      if (confirm('Delete this element?')) {
                        removeChapter.mutate({ id: selectedId });
                        setSelectedId(null);
                      }
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
                <TitlePageForm key={selectedId} projectId={id} data={data} onSave={(d) => updateData.mutate({ id: selectedId, data: d })} />
              ) : selectedKind === ChapterKind.COPYRIGHT ? (
                <CopyrightForm
                  key={selectedId}
                  bookTitle={project.data?.title ?? ''}
                  data={data}
                  onSave={(d) => updateData.mutate({ id: selectedId, data: d })}
                />
              ) : (
                <>
                  {/* Document canvas: the section's title / subtitle / opening quote
                      read as one continuous page above the body. */}
                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="px-8 pb-2 pt-8">
                    {!NO_TITLE_KINDS.includes(selectedKind as ChapterKind) && (
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => title.trim() && updateMeta.mutate({ id: selectedId, title, subtitle })}
                        className="w-full bg-transparent text-center text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/40"
                        placeholder={`${KIND_LABELS[selectedKind as ChapterKind] ?? 'Section'} title`}
                      />
                    )}
                    {SUBTITLE_KINDS.includes(selectedKind as ChapterKind) && (
                      <input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        onBlur={() => updateMeta.mutate({ id: selectedId, title, subtitle: subtitle || null })}
                        className="mt-1 w-full bg-transparent text-center italic text-muted-foreground outline-none placeholder:text-muted-foreground/40"
                        placeholder="Subtitle (optional)"
                      />
                    )}
                    {OPENING_QUOTE_KINDS.includes(selectedKind as ChapterKind) && (
                      <>
                        <textarea
                          className="mt-2 w-full resize-none bg-transparent text-center text-sm italic text-muted-foreground outline-none placeholder:text-muted-foreground/40"
                          rows={openingQuote ? 2 : 1}
                          value={openingQuote}
                          onChange={(e) => setOpeningQuote(e.target.value)}
                          onBlur={() => saveOpening(openingQuote, openingAttr)}
                          placeholder="Opening quote (optional)"
                        />
                        <input
                          value={openingAttr}
                          onChange={(e) => setOpeningAttr(e.target.value)}
                          onBlur={() => saveOpening(openingQuote, openingAttr)}
                          className="w-full bg-transparent text-center text-xs uppercase tracking-wide text-muted-foreground outline-none placeholder:text-muted-foreground/40"
                          placeholder="Attribution (optional)"
                        />
                      </>
                    )}
                    {NO_TITLE_KINDS.includes(selectedKind as ChapterKind) && (
                      <p className="text-center text-xs text-muted-foreground">
                        {selectedKind === ChapterKind.EPIGRAPH
                          ? 'Type the epigraph quote in the editor below; set attribution & style here.'
                          : 'Type your dedication in the editor below.'}
                      </p>
                    )}
                    {selectedKind === ChapterKind.EPIGRAPH && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-left">
                        <div className="space-y-1">
                          <Label>Attribution</Label>
                          <Input
                            defaultValue={(data.attribution as string) ?? ''}
                            placeholder="Attribution (optional)"
                            onBlur={(e) => {
                              const cleanAttr = normalizeAttribution(e.target.value);
                              e.target.value = cleanAttr;
                              updateData.mutate({ id: selectedId, data: { ...data, attribution: cleanAttr || undefined } });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Style</Label>
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                            defaultValue={(data.style as string) ?? 'centered'}
                            onChange={(e) =>
                              updateData.mutate({ id: selectedId, data: { ...data, style: e.target.value } })
                            }
                          >
                            <option value="centered">Centered italic</option>
                            <option value="plain">Plain (no rules)</option>
                            <option value="bordered">Left rule · left aligned</option>
                            <option value="large">Large text</option>
                            <option value="pull">Display / pull quote</option>
                            <option value="shaded">Shaded panel</option>
                            <option value="box">Boxed</option>
                            <option value="double">Double-rule top & bottom</option>
                            <option value="left">Plain · left aligned</option>
                          </select>
                        </div>
                      </div>
                    )}
                    </div>

                    <ManuscriptEditor
                    key={selectedId}
                    frameless
                    aiEnabled={aiStatus.data?.enabled && aiStatus.data?.hasKey}
                    projectId={id}
                    chapterId={selectedId ?? undefined}
                    bookTitle={project.data?.title}
                    initialContent={chapter.data.content as JSONContent}
                    structureTags={OPENING_QUOTE_KINDS.includes(selectedKind as ChapterKind)}
                    onTagField={(field, text) => {
                      if (!selectedId) return;
                      if (field === 'title') {
                        setTitle(text);
                        updateMeta.mutate({ id: selectedId, title: text, subtitle: subtitle || null });
                      } else if (field === 'subtitle') {
                        setSubtitle(text);
                        updateMeta.mutate({ id: selectedId, title, subtitle: text });
                      } else if (field === 'openingQuote') {
                        setOpeningQuote(text);
                        saveOpening(text, openingAttr);
                      } else {
                        setOpeningAttr(text);
                        saveOpening(openingQuote, text);
                      }
                    }}
                    onSave={async (content) => {
                      await updateContent.mutateAsync({ id: selectedId, content });
                      // Keep the embedded preview in sync without a page reload.
                      void utils.formatting.previewData.invalidate({ projectId: id });
                    }}
                    onSplit={(before, after) =>
                      split.mutate({ id: selectedId, before, after, newTitle: 'Untitled chapter' })
                    }
                  />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Paste your whole draft into the page, then select any line and use the{' '}
                    <span className="font-medium">Selection →</span> buttons to tag it as the title,
                    subtitle, opening quote, attribution, or a block quote — it formats instantly.
                    Switch to <span className="font-medium">Preview</span> to see the finished book.
                  </p>
                </>
              )}
            </>
          )}
        </section>
      </div>
      </div>

      {generateModalOpen && (
        <GenerateBookModal
          projectId={id}
          projectTitle={project.data?.title ?? 'Untitled book'}
          onCreated={() => {
            setGenerateModalOpen(false);
            void refresh();
          }}
          onClose={() => setGenerateModalOpen(false)}
        />
      )}
    </div>
  );
}
