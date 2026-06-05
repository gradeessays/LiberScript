'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { coverDimensions, renderCoverHtml, type Binding, type PaperType } from '@liberscript/format';
import { KDP_TRIM_SIZES } from '@liberscript/core';
import { Button, cn, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { extractDominantColor } from '@/lib/dominant-color';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ScaledStage } from '@/components/scaled-stage';

interface CoverState {
  frontImageStorageKey?: string;
  backgroundImageStorageKey?: string;
  frontFullBleed?: boolean;
  dominantColor?: string;
  spineColor?: string;
  textColor?: string;
  backText?: string;
  spineText?: string;
  paper?: PaperType;
  pageCount?: number;
  trimKey?: string;
  binding?: Binding;
}

function trimOf(trimKey?: string): { widthIn: number; heightIn: number } {
  const t = KDP_TRIM_SIZES.find((x) => x.key === trimKey);
  return t ? { widthIn: t.widthIn, heightIn: t.heightIn } : { widthIn: 6, heightIn: 9 };
}

/** Color picker + hex text input bound to the same value. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-1">
        <input
          type="color"
          className="h-9 w-10 shrink-0 rounded border"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="h-9 font-mono text-xs"
        />
      </div>
    </div>
  );
}

export default function CoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const query = trpc.cover.get.useQuery({ projectId: id });
  const frontInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);

  const [cover, setCover] = useState<CoverState>({ paper: 'white', pageCount: 200, trimKey: '6x9' });
  useEffect(() => {
    if (query.data) setCover((c) => ({ ...c, ...(query.data.cover as CoverState) }));
  }, [query.data]);

  const update = trpc.cover.update.useMutation({
    onSuccess: () => utils.cover.get.invalidate({ projectId: id }),
  });
  const assetUploadUrl = trpc.cover.assetUploadUrl.useMutation();

  const set = (patch: Partial<CoverState>) => setCover((c) => ({ ...c, ...patch }));
  const binding: Binding = cover.binding ?? 'paperback';

  async function uploadImage(file: File, kind: 'front' | 'background'): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const { uploadUrl, storageKey } = await assetUploadUrl.mutateAsync({
      projectId: id,
      kind,
      contentType: file.type || 'image/png',
      ext,
    });
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return storageKey;
  }

  async function onFront(file: File) {
    const dominant = await extractDominantColor(file);
    const storageKey = await uploadImage(file, 'front');
    const patch = {
      frontImageStorageKey: storageKey,
      dominantColor: cover.dominantColor ?? dominant.color,
      textColor: cover.textColor ?? dominant.textColor,
    };
    set(patch);
    await update.mutateAsync({ projectId: id, cover: patch });
  }

  async function onBackground(file: File) {
    const dominant = await extractDominantColor(file);
    const storageKey = await uploadImage(file, 'background');
    const patch = { backgroundImageStorageKey: storageKey, textColor: cover.textColor ?? dominant.textColor };
    set(patch);
    await update.mutateAsync({ projectId: id, cover: patch });
  }

  async function clearBackground() {
    set({ backgroundImageStorageKey: undefined });
    await update.mutateAsync({ projectId: id, cover: { backgroundImageStorageKey: null } });
  }

  const trim = trimOf(cover.trimKey);
  const dims = coverDimensions({
    trimWidthIn: trim.widthIn,
    trimHeightIn: trim.heightIn,
    pageCount: cover.pageCount ?? 0,
    paper: cover.paper ?? 'white',
    binding,
  });

  const autoSpine =
    (cover.pageCount ?? 0) >= 100 && query.data
      ? `${query.data.title}${query.data.author ? ` — ${query.data.author}` : ''}`
      : '';

  const html = useMemo(() => {
    if (!query.data) return '';
    return renderCoverHtml({
      title: query.data.title,
      author: query.data.author,
      trimWidthIn: trim.widthIn,
      trimHeightIn: trim.heightIn,
      pageCount: cover.pageCount ?? 0,
      paper: cover.paper ?? 'white',
      binding,
      mode: 'preview',
      dominantColor: cover.dominantColor ?? '#334155',
      spineColor: cover.spineColor,
      textColor: cover.textColor,
      backText: cover.backText,
      spineText: cover.spineText,
      frontImageUrl: query.data.frontImageUrl,
      frontFullBleed: cover.frontFullBleed,
      backgroundImageUrl: query.data.backgroundImageUrl,
    });
  }, [query.data, cover, trim.widthIn, trim.heightIn, binding]);
  const debouncedHtml = useDebouncedValue(html, 350);
  const naturalW = dims.totalWidthIn * 96;
  const naturalH = dims.totalHeightIn * 96;

  if (query.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (query.error) return <p className="text-destructive">{query.error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
            ← Project
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Cover Studio</h1>
        </div>
        <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ projectId: id, cover })}>
          {update.isPending ? 'Saving…' : 'Save cover'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Front cover</h2>
            <input
              ref={frontInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFront(f);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => frontInput.current?.click()}>
              {cover.frontImageStorageKey ? 'Replace front cover' : 'Upload front cover'}
            </Button>
            <div className="flex gap-1">
              {([['fill', 'Fill'], ['centered', 'Centered']] as const).map(([v, label]) => {
                const fill = cover.frontFullBleed !== false;
                const active = (v === 'fill') === fill;
                return (
                  <button
                    key={v}
                    onClick={() => set({ frontFullBleed: v === 'fill' })}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs',
                      active ? 'bg-accent font-medium' : 'hover:bg-accent',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Fill: art covers the whole front (to the trim edges &amp; spine). Centered: art floats
              inside, background fills the rest.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Background</h2>
            <input
              ref={bgInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onBackground(f);
              }}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => bgInput.current?.click()}>
                {cover.backgroundImageStorageKey ? 'Replace pattern' : 'Upload pattern / image'}
              </Button>
              {cover.backgroundImageStorageKey && (
                <Button variant="ghost" size="sm" onClick={() => void clearBackground()}>
                  Use color
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use a pattern/image when a single color can&apos;t capture the background, or set exact
              colors below.
            </p>
            {!cover.backgroundImageStorageKey && (
              <div className="grid grid-cols-2 gap-2">
                <ColorField
                  label="Background"
                  value={cover.dominantColor ?? '#334155'}
                  onChange={(v) => set({ dominantColor: v })}
                />
                <ColorField
                  label="Spine"
                  value={cover.spineColor ?? cover.dominantColor ?? '#334155'}
                  onChange={(v) => set({ spineColor: v })}
                />
              </div>
            )}
            <ColorField
              label="Text color (back/spine)"
              value={cover.textColor ?? '#ffffff'}
              onChange={(v) => set({ textColor: v })}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Specs (spine width)</h2>
            <div className="space-y-1">
              <Label>Book size</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={cover.trimKey ?? '6x9'}
                onChange={(e) => set({ trimKey: e.target.value })}
              >
                {KDP_TRIM_SIZES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Page count</Label>
                <Input
                  type="number"
                  value={cover.pageCount ?? ''}
                  onChange={(e) => set({ pageCount: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label>Paper</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={cover.paper ?? 'white'}
                  onChange={(e) => set({ paper: e.target.value as PaperType })}
                >
                  <option value="white">White</option>
                  <option value="cream">Cream</option>
                  <option value="color">Color</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Spine: {dims.spineIn.toFixed(3)} in · Full wrap: {dims.totalWidthIn.toFixed(2)} ×{' '}
              {dims.totalHeightIn.toFixed(2)} in
            </p>
          </section>

          <section className="space-y-1">
            <Label htmlFor="spine">Spine text</Label>
            <Input
              id="spine"
              value={cover.spineText ?? ''}
              onChange={(e) => set({ spineText: e.target.value })}
              placeholder={autoSpine || 'Blank under 100 pages'}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for an empty spine on export. Default shown as placeholder.
            </p>
          </section>

          <section className="space-y-1">
            <Label htmlFor="back">Back-cover description</Label>
            <textarea
              id="back"
              className="min-h-40 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={cover.backText ?? ''}
              onChange={(e) => set({ backText: e.target.value })}
              placeholder="The blurb that sells your book…"
            />
          </section>
        </aside>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(['paperback', 'hardcover'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => set({ binding: b })}
                  className={cn(
                    'rounded-md border px-3 py-1 text-sm capitalize',
                    binding === b ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Mockup guides — <span className="text-red-500">red = trim</span>,{' '}
              <span className="text-blue-500">blue = safe</span>, dashed = spine folds. Guides &amp;
              barcode are removed on export.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <ScaledStage width={naturalW} height={naturalH} maxHeight={560}>
              <iframe
                title="Cover preview"
                srcDoc={debouncedHtml}
                sandbox="allow-same-origin"
                style={{ width: naturalW, height: naturalH, border: 0, display: 'block', background: '#fff' }}
              />
            </ScaledStage>
          </div>
        </section>
      </div>
    </div>
  );
}
