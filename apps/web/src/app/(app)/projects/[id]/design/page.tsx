'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { THEMES, FONTS, getTheme, renderBookDocument, type ReadingMode } from '@liberscript/format';
import { KDP_TRIM_SIZES, type TypographyOverrides } from '@liberscript/core';
import { Button, cn, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { DeviceFrame, type DeviceKind } from '@/components/device-frame';

type Target = 'print' | 'ebook';

const FONT_OPTIONS = Object.entries(FONTS).map(([key, f]) => ({ key, name: f.name }));

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  if (preview.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (preview.error) return <p className="text-destructive">{preview.error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
            ← Project
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Design &amp; preview</h1>
        </div>
        <Button
          size="sm"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({
              projectId: id,
              themeKey,
              publisherName: publisher || null,
              author: author || null,
              typography: typo,
            })
          }
        >
          {update.isPending ? 'Saving…' : 'Save design'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
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

        {/* Preview */}
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
              <DeviceFrame device={device} srcDoc={debouncedHtml} />
            </div>
          ) : (
            <iframe
              title="Book preview"
              className="h-[80vh] w-full rounded-lg border bg-white"
              srcDoc={debouncedHtml}
              sandbox="allow-same-origin"
            />
          )}
        </section>
      </div>
    </div>
  );
}
