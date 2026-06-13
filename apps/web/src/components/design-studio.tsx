'use client';

import { useEffect, useMemo, useRef, useState, useId } from 'react';
import {
  THEMES,
  FONTS,
  CHAPTER_STYLES,
  OPENING_QUOTE_STYLES,
  BLOCKQUOTE_STYLES,
  SUBTITLE_STYLES,
  getTheme,
  renderBookDocument,
  type ReadingMode,
} from '@liberscript/format';
import { KDP_TRIM_SIZES, type HeaderContent, type TypographyOverrides } from '@liberscript/core';
import { Button, cn, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { DeviceFrame, type DeviceKind } from '@/components/device-frame';

type Target = 'print' | 'ebook';
type PrintMode = 'flow' | 'scroll' | 'flip';
type ExportFmt = 'EPUB' | 'DOCX' | 'COVER_PDF' | 'PRINT_PDF';

const EXPORT_OPTIONS: { format: ExportFmt; label: string; hint: string }[] = [
  { format: 'PRINT_PDF', label: 'Print PDF (interior)', hint: 'Paginated book interior at your trim size' },
  { format: 'EPUB', label: 'EPUB (e-book)', hint: 'Reflowable — Kindle, Apple Books, Kobo' },
  { format: 'DOCX', label: 'Word (.docx)', hint: 'Your size, fonts & spacing' },
  { format: 'COVER_PDF', label: 'Cover PDF', hint: 'Press-ready wrap from Cover Studio' },
];

const FONT_OPTIONS = Object.entries(FONTS).map(([key, f]) => ({ key, name: f.name }));

const EPIGRAPH_STYLE_OPTIONS = [
  { key: 'centered', name: 'Centered italic (default)' },
  { key: 'plain',    name: 'Plain (no rules)' },
  { key: 'bordered', name: 'Left rule · left aligned' },
  { key: 'large',    name: 'Large text' },
  { key: 'pull',     name: 'Display / pull quote' },
  { key: 'shaded',   name: 'Shaded panel' },
  { key: 'box',      name: 'Boxed' },
  { key: 'double',   name: 'Double-rule top & bottom' },
  { key: 'left',     name: 'Plain · left aligned' },
];

function HeaderSelect({ value, onChange }: { value: HeaderContent; onChange: (v: HeaderContent) => void }) {
  return (
    <select
      className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value as HeaderContent)}
    >
      <option value="bookTitle">Book title</option>
      <option value="author">Author</option>
      <option value="chapterTitle">Chapter title</option>
      <option value="none">None</option>
    </select>
  );
}

/**
 * The full design + whole-book preview surface. Used standalone on /design and
 * embedded inside the editor's Preview mode, so styling and the live render stay
 * in one place. `embedded` drops the standalone heading (the editor owns the
 * header) and tightens the control column.
 */
export function DesignStudio({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
  const id = projectId;
  const utils = trpc.useUtils();
  const preview = trpc.formatting.previewData.useQuery({ projectId: id });

  const [themeKey, setThemeKey] = useState('novel-classic');
  const [target, setTarget] = useState<Target>('print');
  const [printMode, setPrintMode] = useState<PrintMode>('scroll');
  const [readingMode, setReadingMode] = useState<ReadingMode>('light');
  const [device, setDevice] = useState<DeviceKind>('phone');
  const [publisher, setPublisher] = useState('');
  const [author, setAuthor] = useState('');
  const [typo, setTypo] = useState<TypographyOverrides>({});
  const logoInput = useRef<HTMLInputElement>(null);
  // Tracks whether the user has manually edited author/publisher in this session.
  const userEditedRef = useRef(false);
  const listId = useId();
  // Discrete switches (style pickers, theme, checkboxes, view toggles) should
  // reflect in the preview immediately; sliders/typing stay debounced below to
  // avoid thrashing the preview iframe on every drag tick / keystroke.
  const previewImmediateRef = useRef(false);
  function markImmediate() {
    previewImmediateRef.current = true;
  }
  function withImmediate<A extends unknown[]>(fn: (...args: A) => void) {
    return (...args: A) => {
      previewImmediateRef.current = true;
      fn(...args);
    };
  }

  const suggestions = trpc.project.authorSuggestions.useQuery();

  // Seed local design state from the server exactly once (first load of this
  // mount). `previewData` refetches after every autosave (author/publisher,
  // logo upload, "Save design") — re-running this on each refetch would
  // overwrite any in-progress, unsaved tweaks (theme, chapter style, layout,
  // typography, etc.) with the last-saved server values, making the preview
  // appear to silently revert.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (preview.data && !initializedRef.current) {
      initializedRef.current = true;
      userEditedRef.current = false;
      setThemeKey(preview.data.themeKey);
      setPublisher(preview.data.meta.publisherName ?? '');
      setAuthor(preview.data.meta.author ?? '');
      setTypo((preview.data.typography ?? {}) as TypographyOverrides);
    }
  }, [preview.data]);

  const update = trpc.formatting.update.useMutation({
    onSuccess: () => utils.formatting.previewData.invalidate({ projectId: id }),
  });
  const logoUploadUrl = trpc.formatting.logoUploadUrl.useMutation();

  // Auto-save author/publisher 800 ms after the user stops typing — preview
  // updates immediately from local state; this just persists the change.
  const debouncedAuthor = useDebouncedValue(author, 800);
  const debouncedPublisher = useDebouncedValue(publisher, 800);
  useEffect(() => {
    if (!userEditedRef.current) return;
    update.mutate({ projectId: id, author: debouncedAuthor || null, publisherName: debouncedPublisher || null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAuthor, debouncedPublisher]);

  const html = useMemo(() => {
    if (!preview.data) return '';
    return renderBookDocument({
      theme: getTheme(themeKey),
      target,
      readingMode,
      paginated: target === 'print' && printMode !== 'flow',
      pageView: printMode === 'flip' ? 'flip' : 'scroll',
      // Self-hosted polyfill (apps/web/public/vendor) — the srcDoc iframe
      // resolves this against the app origin; unpkg stays as auto-fallback.
      pagedPolyfillUrl: '/vendor/pagedjs/paged.polyfill.min.js',
      watermark: preview.data.watermark,
      typography: typo,
      meta: {
        title: preview.data.meta.title,
        author: author || undefined,
        publisherName: publisher || undefined,
        logoUrl: preview.data.meta.logoUrl,
      },
      elements: preview.data.elements.map((e) => ({
        kind: e.kind,
        title: e.title,
        subtitle: e.subtitle,
        data: e.data,
        content: e.content,
      })),
    });
  }, [preview.data, themeKey, target, printMode, readingMode, publisher, author, typo]);
  const debouncedHtml = useDebouncedValue(html, 350, previewImmediateRef);

  async function onLogoFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const { uploadUrl, storageKey } = await logoUploadUrl.mutateAsync({
      projectId: id,
      contentType: file.type || 'image/png',
      ext,
    });
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    await update.mutateAsync({ projectId: id, logoStorageKey: storageKey });
  }

  const setT = (patch: Partial<TypographyOverrides>) => setTypo((t) => ({ ...t, ...patch }));
  const saveArgs = () => ({
    projectId: id,
    themeKey,
    publisherName: publisher || null,
    author: author || null,
    typography: typo,
  });
  const save = () => update.mutate(saveArgs());

  // Export: persist the current design first so the file matches the preview,
  // then queue the job and auto-download the moment it's ready.
  const exportCreate = trpc.export.create.useMutation({
    onSuccess: () => utils.export.list.invalidate({ projectId: id }),
  });
  const exportsQ = trpc.export.list.useQuery(
    { projectId: id },
    {
      refetchInterval: (q) => {
        const data = q.state.data;
        return data?.some((j) => j.status === 'QUEUED' || j.status === 'RUNNING') ? 2000 : false;
      },
    },
  );
  const [exporting, setExporting] = useState<ExportFmt | null>(null);
  // Auto-download is LOCKED to jobs the user started in this session — opening
  // the preview later must never re-download old export artifacts.
  const watching = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const j of exportsQ.data ?? []) {
      if (j.status === 'SUCCEEDED' && j.downloadUrl && watching.current.has(j.id)) {
        watching.current.delete(j.id);
        const a = document.createElement('a');
        a.href = j.downloadUrl;
        a.download = j.fileName ?? '';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setExporting(null);
      }
      if (j.status === 'FAILED' && watching.current.has(j.id)) {
        watching.current.delete(j.id);
        setExporting(null);
      }
    }
  }, [exportsQ.data]);

  async function exportAs(format: ExportFmt) {
    setExporting(format);
    try {
      await update.mutateAsync(saveArgs());
      const { jobId } = await exportCreate.mutateAsync({ projectId: id, format });
      watching.current.add(jobId);
    } catch {
      setExporting(null);
    }
  }

  if (preview.isLoading) return <p className="text-muted-foreground">Loading preview…</p>;
  if (preview.error) return <p className="text-destructive">{preview.error.message}</p>;

  return (
    <div className="space-y-3">
      {!embedded && (
        <div className="flex items-center justify-end">
          <Button size="sm" disabled={update.isPending} onClick={save}>
            {update.isPending ? 'Saving…' : 'Save design'}
          </Button>
        </div>
      )}

      <div className={cn('grid gap-4 items-start', embedded ? 'lg:grid-cols-[1fr_300px]' : 'lg:grid-cols-[320px_1fr]')}>
        {/* Preview comes first when embedded so the book is the focus; controls sit
            to the right. Standalone keeps controls on the left. */}
        {embedded && (
          <PreviewPane
            target={target}
            setTarget={withImmediate(setTarget)}
            printMode={printMode}
            setPrintMode={withImmediate(setPrintMode)}
            readingMode={readingMode}
            setReadingMode={withImmediate(setReadingMode)}
            device={device}
            setDevice={setDevice}
            html={debouncedHtml}
          />
        )}

        <aside className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-5 overflow-y-auto pb-4 pr-1 [scrollbar-width:thin]">
          {embedded && (
            <Button size="sm" className="w-full" disabled={update.isPending} onClick={save}>
              {update.isPending ? 'Saving…' : 'Save design'}
            </Button>
          )}

          {/* Export — saves the current design, builds the formatted file, downloads it */}
          <section className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <h2 className="text-sm font-medium">Export</h2>
            <p className="text-xs text-muted-foreground">
              Downloads your book formatted with the size, fonts and design shown in the preview.
            </p>
            <div className="grid gap-2">
              {EXPORT_OPTIONS.map((o) => (
                <Button
                  key={o.format}
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col items-start py-2"
                  disabled={exporting !== null}
                  onClick={() => exportAs(o.format)}
                >
                  <span className="font-medium">
                    {exporting === o.format ? 'Preparing…' : `Download ${o.label}`}
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">{o.hint}</span>
                </Button>
              ))}
            </div>
            {(exportsQ.data?.length ?? 0) > 0 && (
              <ul className="space-y-1 pt-1 text-xs">
                {exportsQ.data!.slice(0, 4).map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{j.format}</span>
                    {j.status === 'SUCCEEDED' && j.downloadUrl ? (
                      <a href={j.downloadUrl} download={j.fileName ?? ''} className="text-primary hover:underline">
                        Download
                      </a>
                    ) : j.status === 'FAILED' ? (
                      <span className="text-destructive" title={j.error ?? ''}>Failed</span>
                    ) : (
                      <span className="text-muted-foreground">Preparing…</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Theme */}
          <section>
            <h2 className="mb-2 text-sm font-medium">Theme</h2>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => {
                const locked = t.premium && !preview.data?.canUsePremiumThemes;
                return (
                  <button
                    key={t.key}
                    onClick={() => { markImmediate(); setThemeKey(t.key); }}
                    className={cn(
                      'rounded-md border p-2 text-left text-xs',
                      themeKey === t.key ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent',
                    )}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="capitalize text-muted-foreground">{t.genre}</div>
                    {t.premium && (
                      <div className={cn('mt-1 inline-block rounded px-1 text-[10px]', locked ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                        {locked ? 'Pro' : 'Pro ✓'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Trim size */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Book size</h2>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={typo.trimKey ?? ''}
              onChange={(e) => { markImmediate(); setT({ trimKey: e.target.value || undefined }); }}
            >
              <option value="">Theme default</option>
              {KDP_TRIM_SIZES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {typo.trimKey === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Width in"
                  value={typo.customTrim?.widthIn ?? ''}
                  onChange={(e) =>
                    setT({
                      customTrim: {
                        widthIn: Number(e.target.value) || 6,
                        heightIn: typo.customTrim?.heightIn ?? 9,
                      },
                    })
                  }
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Height in"
                  value={typo.customTrim?.heightIn ?? ''}
                  onChange={(e) =>
                    setT({
                      customTrim: {
                        widthIn: typo.customTrim?.widthIn ?? 6,
                        heightIn: Number(e.target.value) || 9,
                      },
                    })
                  }
                />
              </div>
            )}
          </section>

          {/* Chapter style */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Chapter style ({CHAPTER_STYLES.length} designs)</h2>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={typo.chapterStyleKey ?? ''}
              onChange={(e) => { markImmediate(); setT({ chapterStyleKey: e.target.value || undefined }); }}
            >
              <option value="">Theme default</option>
              {CHAPTER_STYLES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Controls how each chapter&apos;s first page looks (number, ornament, dividers, frames,
              drop cap, spacing…).
            </p>
          </section>

          {/* Quote presentation */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Quote styles</h2>
            <div className="space-y-1">
              <Label className="text-[11px]">Opening quote (chapter epigraph)</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                value={typo.openingQuoteStyleKey ?? 'centered'}
                onChange={(e) => { markImmediate(); setT({ openingQuoteStyleKey: e.target.value }); }}
              >
                {OPENING_QUOTE_STYLES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Epigraph section (default style)</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                value={typo.defaultEpigraphStyleKey ?? 'centered'}
                onChange={(e) => { markImmediate(); setT({ defaultEpigraphStyleKey: e.target.value }); }}
              >
                {EPIGRAPH_STYLE_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Per-chapter style (set in the editor) takes priority.
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Block quotes (in the text)</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                value={typo.blockQuoteStyleKey ?? 'left-rule'}
                onChange={(e) => { markImmediate(); setT({ blockQuoteStyleKey: e.target.value }); }}
              >
                {BLOCKQUOTE_STYLES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Page layout / breaks */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Page layout</h2>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={typo.chaptersNewPage ?? true}
                onChange={(e) => { markImmediate(); setT({ chaptersNewPage: e.target.checked }); }}
              />
              Each chapter / section starts on a new page
            </label>
            <label className={cn('flex items-center gap-2 text-xs', typo.chaptersNewPage === false && 'opacity-40')}>
              <input
                type="checkbox"
                disabled={typo.chaptersNewPage === false}
                checked={typo.sectionsRecto ?? false}
                onChange={(e) => { markImmediate(); setT({ sectionsRecto: e.target.checked }); }}
              />
              Start on a right-hand (odd) page
            </label>
            <p className="text-xs text-muted-foreground">
              Print convention — inserts a blank page where needed. Visible in the print PDF export.
            </p>
            <div className="space-y-1 pt-1">
              <Label className="text-[11px]">Page margins (inches) — blank = theme default</Label>
              <div className="grid grid-cols-4 gap-1">
                {(['top', 'bottom', 'inner', 'outer'] as const).map((side) => (
                  <div key={side} className="space-y-0.5">
                    <span className="block text-center text-[10px] capitalize text-muted-foreground">
                      {side}
                    </span>
                    <Input
                      type="number"
                      step="0.05"
                      min={0.2}
                      max={2}
                      className="h-8 px-1 text-center text-xs"
                      value={typo.marginsIn?.[side] ?? ''}
                      placeholder="–"
                      onChange={(e) => {
                        const v = e.target.value === '' ? undefined : Number(e.target.value);
                        setT({ marginsIn: { ...typo.marginsIn, [side]: v } });
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Inner = the spine side.</p>
            </div>
          </section>

          {/* Running headers & page numbers (print) */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Headers &amp; page numbers</h2>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={typo.pageNumbers ?? true}
                onChange={(e) => { markImmediate(); setT({ pageNumbers: e.target.checked }); }}
              />
              Show page numbers
            </label>
            {(typo.pageNumbers ?? true) && (
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                value={typo.pageNumberPlacement ?? 'bottom-center'}
                onChange={(e) => { markImmediate(); setT({ pageNumberPlacement: e.target.value as typeof typo.pageNumberPlacement }); }}
              >
                <option value="bottom-center">Bottom — centered</option>
                <option value="bottom-outer">Bottom — outer corner</option>
                <option value="top-outer">Top — outer corner</option>
              </select>
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={typo.runningHeaders ?? true}
                onChange={(e) => { markImmediate(); setT({ runningHeaders: e.target.checked }); }}
              />
              Running headers
            </label>
            {(typo.runningHeaders ?? true) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Left (even) pages</Label>
                  <HeaderSelect
                    value={typo.headerVersoContent ?? 'bookTitle'}
                    onChange={(v) => { markImmediate(); setT({ headerVersoContent: v }); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Right (odd) pages</Label>
                  <HeaderSelect
                    value={typo.headerRectoContent ?? 'chapterTitle'}
                    onChange={(v) => { markImmediate(); setT({ headerRectoContent: v }); }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              “Chapter title” updates per chapter. Opening pages &amp; front matter omit the header
              automatically. Visible in the print PDF export.
            </p>
          </section>

          {/* Typography */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Typography</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Body font</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                  value={typo.bodyFontKey ?? ''}
                  onChange={(e) => { markImmediate(); setT({ bodyFontKey: e.target.value || undefined }); }}
                >
                  <option value="">Theme</option>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Heading font</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                  value={typo.headingFontKey ?? ''}
                  onChange={(e) => { markImmediate(); setT({ headingFontKey: e.target.value || undefined }); }}
                >
                  <option value="">Theme</option>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="block text-xs">
              Font size: {typo.fontScalePct ?? 100}%
              <input
                type="range"
                min={80}
                max={130}
                value={typo.fontScalePct ?? 100}
                onChange={(e) => setT({ fontScalePct: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block text-xs">
              Line spacing: {(typo.lineHeight ?? 1.5).toFixed(2)}
              <input
                type="range"
                min={120}
                max={200}
                value={Math.round((typo.lineHeight ?? 1.5) * 100)}
                onChange={(e) => setT({ lineHeight: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </label>
            <label className="block text-xs">
              Paragraph spacing: {(typo.paragraphSpacingEm ?? 0).toFixed(2)}em
              <input
                type="range"
                min={0}
                max={150}
                value={Math.round((typo.paragraphSpacingEm ?? 0) * 100)}
                onChange={(e) => setT({ paragraphSpacingEm: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={typo.blockParagraphs ?? false}
                onChange={(e) => { markImmediate(); setT({ blockParagraphs: e.target.checked }); }}
              />
              Block paragraphs (no indent)
            </label>

            {/* Subtitle & heading spacing */}
            <div className="space-y-1 border-t pt-2">
              <Label className="text-[11px]">Subtitle style</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                value={typo.subtitleStyleKey ?? 'italic'}
                onChange={(e) => { markImmediate(); setT({ subtitleStyleKey: e.target.value }); }}
              >
                {SUBTITLE_STYLES.map((s) => (
                  <option key={s.key} value={s.key}>{s.name}</option>
                ))}
              </select>
            </div>
            <label className="block text-xs">
              Title → subtitle gap: {(typo.subtitleSpacingEm ?? 0.3).toFixed(2)}em
              <input
                type="range"
                min={0}
                max={150}
                value={Math.round((typo.subtitleSpacingEm ?? 0.3) * 100)}
                onChange={(e) => setT({ subtitleSpacingEm: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </label>
            <label className="block text-xs">
              Heading → body gap: {(typo.headingSpacingEm ?? 1.6).toFixed(2)}em
              <input
                type="range"
                min={0}
                max={300}
                value={Math.round((typo.headingSpacingEm ?? 1.6) * 100)}
                onChange={(e) => setT({ headingSpacingEm: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </label>

            {/* Per-element manual size + color */}
            <div className="space-y-3 border-t pt-3">
              <p className="text-[11px] text-muted-foreground">
                Manual sizes override the theme scale. Colors range from grey to black.
              </p>
              {(
                [
                  { label: 'Chapter title', sizeKey: 'titleFontSizePt', colorKey: 'titleColor', defaultPt: 18 },
                  { label: 'Subtitle', sizeKey: 'subtitleFontSizePt', colorKey: 'subtitleColor', defaultPt: 12 },
                  { label: 'Opening quote', sizeKey: 'openingQuoteFontSizePt', colorKey: 'openingQuoteColor', defaultPt: 11 },
                ] as const
              ).map(({ label, sizeKey, colorKey, defaultPt }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-[11px]">{label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={6}
                      max={72}
                      step={0.5}
                      placeholder={`${defaultPt}pt`}
                      value={typo[sizeKey] ?? ''}
                      className="h-8 w-20 px-1 text-xs"
                      onChange={(e) => setT({ [sizeKey]: e.target.value ? Number(e.target.value) : undefined })}
                    />
                    <span className="text-[10px] text-muted-foreground">pt</span>
                    <input
                      type="color"
                      title={`${label} color`}
                      value={typo[colorKey] ?? '#111111'}
                      className="h-8 w-10 cursor-pointer rounded border border-input p-0.5"
                      onChange={(e) => { markImmediate(); setT({ [colorKey]: e.target.value }); }}
                    />
                    {(typo[sizeKey] || typo[colorKey]) && (
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => { markImmediate(); setT({ [sizeKey]: undefined, [colorKey]: undefined }); }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Front matter quick fields */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Cover / front matter</h2>
            <datalist id={`${listId}-authors`}>
              {suggestions.data?.authors.map((a) => <option key={a} value={a} />)}
            </datalist>
            <datalist id={`${listId}-publishers`}>
              {suggestions.data?.publishers.map((p) => <option key={p} value={p} />)}
            </datalist>
            <div className="space-y-1">
              <Label htmlFor="author">Author / pen name</Label>
              <Input
                id="author"
                list={`${listId}-authors`}
                value={author}
                onChange={(e) => { setAuthor(e.target.value); userEditedRef.current = true; }}
                placeholder="e.g. J.K. Rowling"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="publisher">Publisher / imprint</Label>
              <Input
                id="publisher"
                list={`${listId}-publishers`}
                value={publisher}
                onChange={(e) => { setPublisher(e.target.value); userEditedRef.current = true; }}
                placeholder="e.g. Penguin Books"
              />
            </div>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onLogoFile(f);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => logoInput.current?.click()}>
              {preview.data?.meta.logoUrl ? 'Replace logo' : 'Upload logo'}
            </Button>
          </section>

          {preview.data?.watermark && (
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              Free plan: exports include a “Made with Liberscript” line. Upgrade to remove it and
              unlock custom fonts &amp; premium themes.
            </p>
          )}
        </aside>

        {!embedded && (
          <PreviewPane
            target={target}
            setTarget={withImmediate(setTarget)}
            printMode={printMode}
            setPrintMode={withImmediate(setPrintMode)}
            readingMode={readingMode}
            setReadingMode={withImmediate(setReadingMode)}
            device={device}
            setDevice={setDevice}
            html={debouncedHtml}
          />
        )}
      </div>
    </div>
  );
}

function PreviewPane({
  target,
  setTarget,
  printMode,
  setPrintMode,
  readingMode,
  setReadingMode,
  device,
  setDevice,
  html,
}: {
  target: Target;
  setTarget: (t: Target) => void;
  printMode: PrintMode;
  setPrintMode: (m: PrintMode) => void;
  readingMode: ReadingMode;
  setReadingMode: (m: ReadingMode) => void;
  device: DeviceKind;
  setDevice: (d: DeviceKind) => void;
  html: string;
}) {
  const paginated = target === 'print' && printMode !== 'flow';
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['print', 'ebook'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={cn(
                'rounded-md px-3 py-1 text-sm',
                target === t ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent',
              )}
            >
              {t === 'print' ? 'Print' : 'E-book'}
            </button>
          ))}
        </div>
        {target === 'print' && (
          <div className="flex gap-1">
            {(
              [
                ['flow', '↕ Continuous', 'Fast continuous scroll'],
                ['scroll', '📄 Pages', 'Real pages, stacked like a PDF viewer'],
                ['flip', '📖 Flip', 'One page at a time — use the ‹ › arrows'],
              ] as const
            ).map(([m, lbl, tip]) => (
              <button
                key={m}
                onClick={() => setPrintMode(m)}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs',
                  printMode === m ? 'bg-accent font-medium' : 'hover:bg-accent',
                )}
                title={tip}
              >
                {lbl}
              </button>
            ))}
          </div>
        )}
        {target === 'ebook' && (
          <>
            <div className="flex gap-1">
              {(['light', 'sepia', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setReadingMode(m)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs capitalize',
                    readingMode === m ? 'bg-accent font-medium' : 'hover:bg-accent',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1">
              {(['phone', 'tablet', 'pc'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs',
                    device === d ? 'bg-accent font-medium' : 'hover:bg-accent',
                  )}
                >
                  {d === 'phone' ? '📱 Phone' : d === 'tablet' ? '📲 Tablet' : '💻 PC'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {target === 'ebook' ? (
        <div className="rounded-lg border bg-muted/30 p-4">
          <DeviceFrame device={device} srcDoc={html} />
        </div>
      ) : (
        <iframe
          title="Book preview"
          className={cn('h-[80vh] w-full rounded-lg border', paginated ? 'bg-[#525659]' : 'bg-white')}
          srcDoc={html}
          // paged.js needs scripts to paginate; the document is app-generated.
          sandbox={paginated ? 'allow-scripts allow-same-origin' : 'allow-same-origin'}
        />
      )}
      {paginated && (
        <p className="text-xs text-muted-foreground">
          Real page layout at your trim size — margins, running headers &amp; page numbers.
          {printMode === 'flip'
            ? ' Click the page edges, the ‹ › arrows or use ← → keys to turn pages.'
            : ' Large books take a moment to paginate — use Continuous for fast scrolling while editing.'}
        </p>
      )}
    </section>
  );
}
