'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@liberscript/ui';
import { BISAC_CATEGORIES, groupOfKind, tiptapText, type ChapterKind, type TiptapDoc } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';
import { useAiStream } from '@/hooks/use-ai-stream';

interface KdpMetadataResult {
  description?: string;
  keywords?: string[];
  categories?: { code: string; label: string }[];
}

function ruleNumber(rules: unknown, key: string, fallback: number): number {
  if (rules && typeof rules === 'object' && key in (rules as object)) {
    const value = (rules as Record<string, unknown>)[key];
    if (typeof value === 'number') return value;
  }
  return fallback;
}

export default function MetadataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();

  const project = trpc.project.get.useQuery({ id });
  const metadata = trpc.metadata.get.useQuery({ projectId: id });
  const platformProfile = trpc.metadata.getPlatformProfile.useQuery({ key: 'kdp' });
  const status = trpc.ai.status.useQuery();

  const save = trpc.metadata.save.useMutation({
    onSuccess: () => void utils.metadata.get.invalidate({ projectId: id }),
  });

  const aiStream = useAiStream();

  const [authorName, setAuthorName] = useState('');
  const [isbn, setIsbn] = useState('');
  const [language, setLanguage] = useState('en');
  const [publisher, setPublisher] = useState('');
  const [blurb, setBlurb] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [genre, setGenre] = useState('');
  const [authorNotes, setAuthorNotes] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const maxKeywords = ruleNumber(platformProfile.data?.rules, 'maxKeywords', 7);
  const keywordMaxLength = ruleNumber(platformProfile.data?.rules, 'keywordMaxLength', 50);
  const maxCategories = ruleNumber(platformProfile.data?.rules, 'maxCategories', 3);
  const blurbMaxLength = ruleNumber(platformProfile.data?.rules, 'blurbMaxLength', 4000);

  // Hydrate the form from saved metadata, once.
  useEffect(() => {
    if (hydrated || !metadata.isSuccess) return;
    const m = metadata.data;
    if (m) {
      setAuthorName(m.authorName ?? '');
      setIsbn(m.isbn ?? '');
      setLanguage(m.language || 'en');
      setPublisher(m.publisher ?? '');
      setBlurb(m.blurb ?? '');
      setKeywords(m.keywords ?? []);
      setCategories(m.categories ?? []);
    }
    setHydrated(true);
  }, [hydrated, metadata.isSuccess, metadata.data]);

  const keywordSlots = useMemo(() => {
    const slots = [...keywords];
    while (slots.length < maxKeywords) slots.push('');
    return slots.slice(0, maxKeywords);
  }, [keywords, maxKeywords]);

  // First narrative chapter — used as context so the AI can read the opening.
  const manuscriptChapters = project.data?.manuscript?.chapters;
  const excerptChapterId = useMemo(() => {
    if (!manuscriptChapters?.length) return undefined;
    const body = manuscriptChapters.find((c) => groupOfKind(c.kind as ChapterKind) === 'body');
    return (body ?? manuscriptChapters[0])?.id;
  }, [manuscriptChapters]);

  const excerptChapter = trpc.chapter.get.useQuery(
    { id: excerptChapterId ?? '' },
    { enabled: !!excerptChapterId },
  );
  const excerpt = excerptChapter.data
    ? tiptapText(excerptChapter.data.content as unknown as TiptapDoc).slice(0, 3000)
    : undefined;

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    const list = query
      ? BISAC_CATEGORIES.filter(
          (c) => c.label.toLowerCase().includes(query) || c.code.toLowerCase().includes(query),
        )
      : genre
        ? BISAC_CATEGORIES.filter((c) => c.label.toLowerCase().includes(genre.trim().toLowerCase()))
        : BISAC_CATEGORIES;
    return list.slice(0, 60);
  }, [categorySearch, genre]);

  const aiEnabled = status.data?.enabled ?? false;

  async function generate() {
    aiStream.reset();
    await aiStream.run({
      projectId: id,
      mode: 'kdp-metadata',
      prompt: authorNotes,
      context: excerpt,
      bookTitle: project.data?.title,
      bookGenre: genre || undefined,
      categoryOptions: filteredCategories,
    });
  }

  const aiResult = useMemo<KdpMetadataResult | null>(() => {
    if (!aiStream.text || aiStream.streaming) return null;
    try {
      const clean = aiStream.text
        .replace(/^```[a-z]*\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      return JSON.parse(clean) as KdpMetadataResult;
    } catch {
      return null;
    }
  }, [aiStream.text, aiStream.streaming]);

  function applyAiResult() {
    if (!aiResult) return;
    if (aiResult.description) setBlurb(aiResult.description);
    if (aiResult.keywords) setKeywords(aiResult.keywords.slice(0, maxKeywords));
    if (aiResult.categories) setCategories(aiResult.categories.map((c) => c.code).slice(0, maxCategories));
  }

  function setKeyword(index: number, value: string) {
    setKeywords((cur) => {
      const next = [...cur];
      while (next.length <= index) next.push('');
      next[index] = value;
      return next.slice(0, maxKeywords);
    });
  }

  function toggleCategory(code: string) {
    setCategories((cur) => {
      if (cur.includes(code)) return cur.filter((c) => c !== code);
      if (cur.length >= maxCategories) return cur;
      return [...cur, code];
    });
  }

  function handleSave() {
    save.mutate({
      projectId: id,
      authorName: authorName || undefined,
      blurb: blurb || undefined,
      keywords: keywords.map((k) => k.trim()).filter(Boolean),
      categories,
      isbn: isbn || undefined,
      language: language || undefined,
      publisher: publisher || undefined,
    });
  }

  if (project.isLoading || metadata.isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (project.error) {
    return <p className="text-destructive">{project.error.message}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
            ← {project.data?.title}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">KDP Metadata</h1>
        </div>
        <Button size="sm" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save metadata'}
        </Button>
      </div>
      <p className="-mt-4 text-sm text-muted-foreground">
        Generate a back-cover description, keywords, and BISAC categories for Amazon KDP.
      </p>

      {!aiEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">Pro feature</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            AI-generated metadata requires a Pro or Team plan with an AI key configured in{' '}
            <Link href="/settings/ai" className="underline">
              Settings → AI Keys
            </Link>
            . You can still fill in metadata manually below.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Book details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Author name</Label>
            <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Genre</Label>
            <Input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Romance, Fantasy, Self-Help"
            />
          </div>
          <div className="space-y-1.5">
            <Label>ISBN</Label>
            <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Publisher</Label>
            <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {aiEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Generate with AI</CardTitle>
            <CardDescription>
              Uses your configured AI key and the opening of your manuscript to draft a back-cover
              description, {maxKeywords} keywords, and up to {maxCategories} BISAC categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Notes for the AI (optional)</Label>
              <textarea
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                placeholder="e.g. emphasize the slow-burn romance and dual POV"
                value={authorNotes}
                onChange={(e) => setAuthorNotes(e.target.value)}
              />
            </div>
            {aiStream.error && <p className="text-sm text-destructive">{aiStream.error}</p>}
            {(aiStream.streaming || (aiStream.text && !aiResult)) && (
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
                {aiStream.text}
                {aiStream.streaming && (
                  <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-foreground/60 align-middle" />
                )}
              </div>
            )}
            {aiResult && (
              <div className="space-y-1 rounded-md border p-3 text-sm">
                <p className="font-medium">AI suggestion ready</p>
                {aiResult.description && (
                  <p className="line-clamp-3 text-muted-foreground">{aiResult.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {aiResult.keywords?.length ?? 0} keywords · {aiResult.categories?.length ?? 0} categories
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            <Button onClick={generate} disabled={aiStream.streaming}>
              {aiStream.streaming ? 'Generating…' : 'Generate metadata'}
            </Button>
            {aiResult && (
              <Button variant="outline" onClick={applyAiResult}>
                Use this
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Back-cover description</CardTitle>
          <CardDescription>
            {blurb.length} / {blurbMaxLength} characters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={8}
            maxLength={blurbMaxLength}
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keywords</CardTitle>
          <CardDescription>Up to {maxKeywords} search terms readers might use to find this book.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {keywordSlots.map((kw, i) => (
            <Input
              key={i}
              value={kw}
              maxLength={keywordMaxLength}
              placeholder={`Keyword ${i + 1}`}
              onChange={(e) => setKeyword(i, e.target.value)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Choose up to {maxCategories} BISAC categories ({categories.length}/{maxCategories} selected).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search categories…"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
          />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((code) => {
                const cat = BISAC_CATEGORIES.find((c) => c.code === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs"
                  >
                    {cat?.label ?? code}
                    <button
                      type="button"
                      onClick={() => toggleCategory(code)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${cat?.label ?? code}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
            {filteredCategories.map((c) => (
              <li key={c.code}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={categories.includes(c.code)}
                    disabled={!categories.includes(c.code) && categories.length >= maxCategories}
                    onChange={() => toggleCategory(c.code)}
                  />
                  <span>{c.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{c.code}</span>
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save metadata'}
        </Button>
      </div>
    </div>
  );
}
