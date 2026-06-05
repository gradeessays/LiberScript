'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { THEMES, getTheme, renderBookDocument } from '@liberscript/format';
import { Button, cn, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

type Target = 'print' | 'ebook';

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const preview = trpc.formatting.previewData.useQuery({ projectId: id });

  const [themeKey, setThemeKey] = useState<string>('novel-classic');
  const [target, setTarget] = useState<Target>('print');
  const [publisher, setPublisher] = useState('');
  const [author, setAuthor] = useState('');
  const logoInput = useRef<HTMLInputElement>(null);

  // Seed local controls once preview data arrives.
  useEffect(() => {
    if (preview.data) {
      setThemeKey(preview.data.themeKey);
      setPublisher(preview.data.meta.publisherName ?? '');
      setAuthor(preview.data.meta.author ?? '');
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
      watermark: preview.data.watermark,
      meta: {
        title: preview.data.meta.title,
        author: author || undefined,
        publisherName: publisher || undefined,
        logoUrl: preview.data.meta.logoUrl,
      },
      chapters: preview.data.chapters.map((c) => ({
        index: c.index,
        title: c.title,
        subtitle: c.subtitle,
        content: c.content,
      })),
    });
  }, [preview.data, themeKey, target, publisher, author]);

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
            })
          }
        >
          {update.isPending ? 'Saving…' : 'Save design'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Controls */}
        <aside className="space-y-5">
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
                    <div className="text-muted-foreground capitalize">{t.genre}</div>
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

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Front matter</h2>
            <div className="space-y-1">
              <Label htmlFor="author">Author</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="publisher">Publisher / imprint</Label>
              <Input id="publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Publisher logo</Label>
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
            </div>
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
          <div className="flex gap-1">
            {(['print', 'ebook'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm capitalize',
                  target === t ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent',
                )}
              >
                {t === 'print' ? 'Print' : 'E-book'}
              </button>
            ))}
          </div>
          <iframe
            title="Book preview"
            className="h-[78vh] w-full rounded-lg border bg-white"
            srcDoc={html}
            sandbox="allow-same-origin"
          />
        </section>
      </div>
    </div>
  );
}
