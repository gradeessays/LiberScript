'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { coverDimensions, renderCoverHtml, type PaperType } from '@liberscript/format';
import { KDP_TRIM_SIZES } from '@liberscript/core';
import { Button, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { extractDominantColor } from '@/lib/dominant-color';
import { useDebouncedValue } from '@/lib/use-debounced-value';

interface CoverState {
  frontImageStorageKey?: string;
  dominantColor?: string;
  spineColor?: string;
  textColor?: string;
  backText?: string;
  paper?: PaperType;
  pageCount?: number;
  trimKey?: string;
}

function trimOf(trimKey?: string): { widthIn: number; heightIn: number } {
  const t = KDP_TRIM_SIZES.find((x) => x.key === trimKey);
  return t ? { widthIn: t.widthIn, heightIn: t.heightIn } : { widthIn: 6, heightIn: 9 };
}

export default function CoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const query = trpc.cover.get.useQuery({ projectId: id });
  const fileInput = useRef<HTMLInputElement>(null);

  const [cover, setCover] = useState<CoverState>({ paper: 'white', pageCount: 200, trimKey: '6x9' });
  useEffect(() => {
    if (query.data) setCover((c) => ({ ...c, ...(query.data.cover as CoverState) }));
  }, [query.data]);

  const update = trpc.cover.update.useMutation({
    onSuccess: () => utils.cover.get.invalidate({ projectId: id }),
  });
  const frontUploadUrl = trpc.cover.frontUploadUrl.useMutation();

  const set = (patch: Partial<CoverState>) => setCover((c) => ({ ...c, ...patch }));

  async function onFront(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const dominant = await extractDominantColor(file);
    const { uploadUrl, storageKey } = await frontUploadUrl.mutateAsync({
      projectId: id,
      contentType: file.type || 'image/png',
      ext,
    });
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    set({
      frontImageStorageKey: storageKey,
      dominantColor: dominant.color,
      spineColor: dominant.color,
      textColor: dominant.textColor,
    });
    await update.mutateAsync({
      projectId: id,
      cover: {
        frontImageStorageKey: storageKey,
        dominantColor: dominant.color,
        spineColor: dominant.color,
        textColor: dominant.textColor,
      },
    });
  }

  const trim = trimOf(cover.trimKey);
  const dims = coverDimensions({
    trimWidthIn: trim.widthIn,
    trimHeightIn: trim.heightIn,
    pageCount: cover.pageCount ?? 0,
    paper: cover.paper ?? 'white',
  });

  const html = useMemo(() => {
    if (!query.data) return '';
    return renderCoverHtml({
      title: query.data.title,
      author: query.data.author,
      trimWidthIn: trim.widthIn,
      trimHeightIn: trim.heightIn,
      pageCount: cover.pageCount ?? 0,
      paper: cover.paper ?? 'white',
      dominantColor: cover.dominantColor ?? '#334155',
      spineColor: cover.spineColor,
      textColor: cover.textColor,
      backText: cover.backText,
      frontImageUrl: query.data.frontImageUrl,
    });
  }, [query.data, cover, trim.widthIn, trim.heightIn]);
  const debouncedHtml = useDebouncedValue(html, 350);

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
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFront(f);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              {cover.frontImageStorageKey ? 'Replace front cover' : 'Upload front cover'}
            </Button>
            <p className="text-xs text-muted-foreground">
              We extract the dominant color for the back &amp; spine automatically.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Colors</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Back / dominant</Label>
                <input
                  type="color"
                  className="h-9 w-full rounded border"
                  value={cover.dominantColor ?? '#334155'}
                  onChange={(e) => set({ dominantColor: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Spine</Label>
                <input
                  type="color"
                  className="h-9 w-full rounded border"
                  value={cover.spineColor ?? cover.dominantColor ?? '#334155'}
                  onChange={(e) => set({ spineColor: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Specs (for spine width)</h2>
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
              {dims.totalHeightIn.toFixed(2)} in (incl. bleed)
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
          <p className="text-xs text-muted-foreground">
            Full-wrap preview (back · spine · front) at KDP trim + bleed. The white box shows the
            ISBN/barcode keep-out area. Spine text appears at 100+ pages.
          </p>
          <iframe
            title="Cover preview"
            className="h-[72vh] w-full rounded-lg border bg-white"
            srcDoc={debouncedHtml}
            sandbox="allow-same-origin"
          />
        </section>
      </div>
    </div>
  );
}
