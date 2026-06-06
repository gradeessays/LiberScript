'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  THEMES,
  FONTS,
  CHAPTER_STYLES,
  OPENING_QUOTE_STYLES,
  BLOCKQUOTE_STYLES,
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
type ExportFmt = 'EPUB' | 'DOCX' | 'COVER_PDF';

const EXPORT_OPTIONS: { format: ExportFmt; label: string; hint: string }[] = [
  { format: 'EPUB', label: 'EPUB (e-book)', hint: 'Reflowable — Kindle, Apple Books, Kobo' },
  { format: 'DOCX', label: 'Word (.docx)', hint: 'Your size, fonts & spacing' },
  { format: 'COVER_PDF', label: 'Cover PDF', hint: 'Press-ready wrap from Cover Studio' },
];

const FONT_OPTIONS = Object.entries(FONTS).map(([key, f]) => ({ key, name: f.name }));

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
  const [readingMode, setReadingMode] = useState<ReadingMode>('light');
  const [device, setDevice] = useState<DeviceKind>('phone');
  const [publisher, setPublisher] = useState('');
  const [author, setAuthor] = useState('');
  const [typo, setTypo] = useState<TypographyOverrides>({});
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preview.data) {
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

  const html = useMemo(() => {
    if (!preview.data) return '';
    return renderBookDocument({
      theme: getTheme(themeKey),
      target,
      readingMode,
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
  }, [preview.data, themeKey, target, readingMode, publisher, author, typo]);
  const debouncedHtml = useDebouncedValue(html, 350);

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
  const downloaded = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const j of exportsQ.data ?? []) {
      if (j.status === 'SUCCEEDED' && j.downloadUrl && !downloaded.current.has(j.id)) {
        downloaded.current.add(j.id);
        const a = document.createElement('a');
        a.href = j.downloadUrl;
        a.download = j.fileName ?? '';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setExporting(null);
      }
    }
  }, [exportsQ.data]);

  async function exportAs(format: ExportFmt) {
    setExporting(format);
    try {
      await update.mutateAsync(saveArgs());
      await exportCreate.mutateAsync({ projectId: id, format });
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

      <div className={cn('grid gap-4', embedded ? 'lg:grid-cols-[1fr_300px]' : 'lg:grid-cols-[320px_1fr]')}>
        {/* Preview comes first when embedded so the book is the focus; controls sit
            to the right. Standalone keeps controls on the left. */}
        {embedded && (
          <PreviewPane
            target={target}
            setTarget={setTarget}
            readingMode={readingMode}
            setReadingMode={setReadingMode}
            device={device}
            setDevice={setDevice}
            html={debouncedHtml}
          />
        )}

        <aside className="space-y-5">
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
                    onClick={() => setThemeKey(t.key)}
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
              onChange={(e) => setT({ trimKey: e.target.value || undefined })}
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
              onChange={(e) => setT({ chapterStyleKey: e.target.value || undefined })}
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
                onChange={(e) => setT({ openingQuoteStyleKey: e.target.value })}
              >
                {OPENING_QUOTE_STYLES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Block quotes (in the text)</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                value={typo.blockQuoteStyleKey ?? 'left-rule'}
                onChange={(e) => setT({ blockQuoteStyleKey: e.target.value })}
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
                onChange={(e) => setT({ chaptersNewPage: e.target.checked })}
              />
              Each chapter / section starts on a new page
            </label>
            <label className={cn('flex items-center gap-2 text-xs', typo.chaptersNewPage === false && 'opacity-40')}>
              <input
                type="checkbox"
                disabled={typo.chaptersNewPage === false}
                checked={typo.sectionsRecto ?? false}
                onChange={(e) => setT({ sectionsRecto: e.target.checked })}
              />
              Start on a right-hand (odd) page
            </label>
            <p className="text-xs text-muted-foreground">
              Print convention — inserts a blank page where needed. Visible in the print PDF export.
            </p>
          </section>

          {/* Running headers & page numbers (print) */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Headers &amp; page numbers</h2>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={typo.pageNumbers ?? true}
                onChange={(e) => setT({ pageNumbers: e.target.checked })}
              />
              Show page numbers
            </label>
            {(typo.pageNumbers ?? true) && (
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-1 text-xs"
                value={typo.pageNumberPlacement ?? 'bottom-center'}
                onChange={(e) => setT({ pageNumberPlacement: e.target.value as typeof typo.pageNumberPlacement })}
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
                onChange={(e) => setT({ runningHeaders: e.target.checked })}
              />
              Running headers
            </label>
            {(typo.runningHeaders ?? true) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Left (even) pages</Label>
                  <HeaderSelect
                    value={typo.headerVersoContent ?? 'bookTitle'}
                    onChange={(v) => setT({ headerVersoContent: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Right (odd) pages</Label>
                  <HeaderSelect
                    value={typo.headerRectoContent ?? 'chapterTitle'}
                    onChange={(v) => setT({ headerRectoContent: v })}
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
                  onChange={(e) => setT({ bodyFontKey: e.target.value || undefined })}
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
                  onChange={(e) => setT({ headingFontKey: e.target.value || undefined })}
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
                onChange={(e) => setT({ blockParagraphs: e.target.checked })}
              />
              Block paragraphs (no indent)
            </label>
          </section>

          {/* Front matter quick fields */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Cover / front matter</h2>
            <div className="space-y-1">
              <Label htmlFor="author">Author</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="publisher">Publisher / imprint</Label>
              <Input id="publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
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
            setTarget={setTarget}
            readingMode={readingMode}
            setReadingMode={setReadingMode}
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
  readingMode,
  setReadingMode,
  device,
  setDevice,
  html,
}: {
  target: Target;
  setTarget: (t: Target) => void;
  readingMode: ReadingMode;
  setReadingMode: (m: ReadingMode) => void;
  device: DeviceKind;
  setDevice: (d: DeviceKind) => void;
  html: string;
}) {
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
          className="h-[80vh] w-full rounded-lg border bg-white"
          srcDoc={html}
          sandbox="allow-same-origin"
        />
      )}
    </section>
  );
}
