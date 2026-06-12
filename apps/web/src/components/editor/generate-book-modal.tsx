'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, cn } from '@liberscript/ui';
import { BookGenre } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';
import { useAiStream } from '@/hooks/use-ai-stream';

interface OutlineChapter {
  number: number;
  title: string;
  summary: string;
}

interface Outline {
  title: string;
  tagline: string;
  chapters: OutlineChapter[];
}

interface Props {
  projectId: string;
  projectTitle: string;
  onCreated: () => void;
  onClose: () => void;
}

const GENRE_LABELS: Record<string, string> = {
  fiction: 'Fiction',
  nonfiction: 'Non-fiction',
  selfhelp: 'Self-help',
  poetry: 'Poetry',
  childrens: "Children's",
};

const TONE_OPTIONS = ['Professional', 'Conversational', 'Literary', 'Suspenseful', 'Humorous', 'Inspiring'];

export function GenerateBookModal({ projectId, projectTitle, onCreated, onClose }: Props) {
  const utils = trpc.useUtils();
  const status = trpc.ai.status.useQuery();
  const styleProfiles = trpc.styleProfile.list.useQuery(undefined, {
    enabled: status.data?.enabled ?? false,
  });
  const createFromOutline = trpc.chapter.createFromOutline.useMutation({
    onSuccess: () => {
      void utils.project.get.invalidate({ id: projectId });
      onCreated();
    },
  });

  const { text: rawText, streaming, error: streamError, run, reset } = useAiStream();

  const [premise, setPremise] = useState('');
  const [genre, setGenre] = useState<string>(BookGenre.FICTION);
  const [tone, setTone] = useState('');
  const [chapterCount, setChapterCount] = useState(12);
  const [styleProfileId, setStyleProfileId] = useState('');
  const [step, setStep] = useState<'form' | 'outline'>('form');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function generateOutline() {
    reset();
    setParseError(null);
    setOutline(null);
    setStep('outline');
    const prompt = [
      `Premise: ${premise}`,
      `Genre: ${GENRE_LABELS[genre] ?? genre}`,
      tone ? `Tone: ${tone}` : null,
      `Target chapter count: approximately ${chapterCount} chapters`,
    ]
      .filter(Boolean)
      .join('\n');
    await run({
      projectId,
      mode: 'outline',
      prompt,
      bookTitle: projectTitle,
      bookGenre: genre,
      styleProfileId: styleProfileId || undefined,
    });
  }

  // Parse the accumulated outline JSON once streaming finishes
  const parsedOutline = (() => {
    if (!rawText || streaming) return null;
    try {
      // Strip any accidental markdown code fences
      const clean = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed = JSON.parse(clean) as Outline;
      return parsed;
    } catch {
      return null;
    }
  })();

  function useOutline() {
    if (!parsedOutline) {
      setParseError('Could not parse the outline. Try generating again.');
      return;
    }
    setOutline(parsedOutline);
  }

  function createBook() {
    if (!outline) return;
    createFromOutline.mutate({
      projectId,
      chapters: outline.chapters.map((c) => ({ title: c.title })),
      styleProfileId: styleProfileId || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Generate book with AI</h2>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto [scrollbar-width:thin]">
          {step === 'form' && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Premise / Topic</label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={4}
                  placeholder="Describe your book idea. E.g. 'A self-help book on building atomic habits for creative professionals. Focus on practical systems over motivation.'"
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Genre</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                  >
                    {Object.entries(GENRE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Chapters (~)</label>
                  <input
                    type="number"
                    min={3}
                    max={40}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={chapterCount}
                    onChange={(e) => setChapterCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tone (optional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(tone === t ? '' : t)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs',
                        tone === t ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {(styleProfiles.data?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Match the style of (optional)</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={styleProfileId}
                    onChange={(e) => setStyleProfileId(e.target.value)}
                  >
                    <option value="">None</option>
                    {styleProfiles.data?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Adopts the tone, voice, and pacing of this profile for the outline and all
                    future writing in this project. Manage profiles in{' '}
                    <Link href="/settings/style-profiles" className="underline" target="_blank">
                      Settings → Style Profiles
                    </Link>
                    .
                  </p>
                </div>
              )}
            </>
          )}

          {step === 'outline' && (
            <>
              {(streaming || (!parsedOutline && !streamError)) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {streaming ? 'Generating outline…' : 'Processing…'}
                  </p>
                  <div className="rounded-md border bg-muted/30 p-3 text-xs font-mono text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap [scrollbar-width:thin]">
                    {rawText}
                    {streaming && <span className="inline-block w-1 h-3.5 bg-foreground/60 animate-pulse ml-0.5 align-middle" />}
                  </div>
                </div>
              )}

              {streamError && (
                <p className="text-sm text-destructive">{streamError}</p>
              )}

              {parseError && (
                <p className="text-sm text-destructive">{parseError}</p>
              )}

              {!streaming && parsedOutline && !outline && (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{parsedOutline.title}</p>
                    {parsedOutline.tagline && (
                      <p className="text-sm text-muted-foreground">{parsedOutline.tagline}</p>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {parsedOutline.chapters.map((ch) => (
                      <li key={ch.number} className="rounded-md border p-2.5 text-sm">
                        <span className="font-medium">Ch {ch.number}: {ch.title}</span>
                        {ch.summary && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{ch.summary}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {outline && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Ready to create <strong>{outline.chapters.length} chapters</strong> in your project.
                  </p>
                  {createFromOutline.error && (
                    <p className="text-sm text-destructive">{createFromOutline.error.message}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={generateOutline} disabled={!premise.trim()}>
                Generate outline
              </Button>
            </>
          )}
          {step === 'outline' && !outline && (
            <>
              <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
              {!streaming && rawText && (
                <Button onClick={useOutline}>Use this outline</Button>
              )}
              {!streaming && streamError && (
                <Button onClick={generateOutline}>Retry</Button>
              )}
            </>
          )}
          {step === 'outline' && outline && (
            <>
              <Button variant="outline" onClick={() => setOutline(null)}>Edit outline</Button>
              <Button onClick={createBook} disabled={createFromOutline.isPending}>
                {createFromOutline.isPending ? 'Creating…' : 'Create book'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
