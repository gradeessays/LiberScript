'use client';

import { useState } from 'react';
import { cn, Button } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

const SEVERITY_STYLE: Record<string, string> = {
  info: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  high: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

const SEVERITY_LABEL: Record<string, string> = { info: 'OK', warn: 'Review', high: 'Fix' };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3" title={hint}>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function scoreTone(score: number): string {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 65) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Whole-book manuscript critique: readiness score, prose metrics, and
 * actionable findings with real examples from the text.
 */
export function CritiquePanel({ projectId }: { projectId: string }) {
  const critique = trpc.analysis.critique.useQuery({ projectId });
  const aiStatus = trpc.ai.status.useQuery();
  const aiCritique = trpc.analysis.aiCritique.useMutation();
  const [open, setOpen] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState<string | null>(null);
  const [focusAreas, setFocusAreas] = useState('');

  if (critique.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Analyzing your manuscript…</p>;
  }
  if (critique.error) {
    return <p className="p-6 text-sm text-destructive">{critique.error.message}</p>;
  }
  const c = critique.data!;
  if (c.wordCount === 0) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Nothing to analyze yet — write or upload some chapters first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score + prose metrics */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border p-5">
        <div className="text-center">
          <div className={cn('text-5xl font-bold tabular-nums', scoreTone(c.score))}>{c.score}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Readiness</div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Words" value={c.wordCount.toLocaleString()} />
          <Stat label="Sentences" value={c.sentenceCount.toLocaleString()} />
          <Stat label="Avg sentence" value={`${c.avgSentenceLen} w`} hint="Average sentence length in words" />
          <Stat label="Reading ease" value={String(c.readingEase)} hint="Flesch Reading Ease (higher = easier; 60–80 suits most fiction)" />
          <Stat label="Grade level" value={String(c.gradeLevel)} hint="Flesch–Kincaid grade level" />
          <Stat label="Dialogue" value={`${Math.round(c.dialogueRatio * 100)}%`} hint="Share of words inside quotation marks" />
        </div>
      </div>

      {/* Findings */}
      <div className="grid gap-3 md:grid-cols-2">
        {c.findings.map((f) => (
          <div key={f.category} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{f.label}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', SEVERITY_STYLE[f.severity])}>
                {SEVERITY_LABEL[f.severity]}
              </span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{f.count.toLocaleString()}</span> found
              {f.per1k > 0 && <> · {f.per1k}/1k words</>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{f.guidance}</p>
            {f.examples.length > 0 && (
              <>
                <button
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                  onClick={() => setOpen(open === f.category ? null : f.category)}
                >
                  {open === f.category ? 'Hide examples' : `Show examples (${f.examples.length})`}
                </button>
                {open === f.category && (
                  <ul className="mt-2 space-y-1.5">
                    {f.examples.map((ex, i) => (
                      <li key={i} className="rounded bg-muted/50 p-2 text-xs">
                        {ex.chapter && (
                          <span className="mr-1 font-medium text-muted-foreground">{ex.chapter}:</span>
                        )}
                        <span className="italic">{ex.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Per-chapter breakdown */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 text-sm font-medium">Chapter breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">Section</th>
                <th className="px-3 py-2 text-right font-medium">Words</th>
                <th className="px-3 py-2 text-right font-medium">Avg sentence</th>
                <th className="px-3 py-2 text-right font-medium">Dialogue</th>
                <th className="px-3 py-2 text-right font-medium">Ease</th>
                <th className="px-4 py-2 text-right font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {c.chapters.map((ch) => (
                <tr key={ch.id} className="border-t">
                  <td className="max-w-56 truncate px-4 py-2" title={ch.title}>{ch.title}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{ch.wordCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{ch.avgSentenceLen}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Math.round(ch.dialogueRatio * 100)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{ch.readingEase}</td>
                  <td className={cn('px-4 py-2 text-right tabular-nums', ch.issueCount > 25 && 'text-amber-600 dark:text-amber-400')}>
                    {ch.issueCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Heuristic critique — a guide, not a verdict. Style rules are yours to break on purpose.
      </p>

      {/* AI Editorial Analysis */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <span className="font-medium">AI Editorial Analysis</span>
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Pro</span>
          </div>
          {aiStatus.data?.enabled && aiStatus.data?.hasKey && !aiCritique.data && (
            <div className="flex items-center gap-2">
              <input
                className="h-8 rounded-md border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Focus areas (optional)"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => aiCritique.mutate({ projectId, focusAreas: focusAreas || undefined })}
                disabled={aiCritique.isPending}
              >
                {aiCritique.isPending ? 'Analysing…' : 'Run AI analysis'}
              </Button>
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          {!aiStatus.data?.enabled && (
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro to unlock AI-powered developmental editing — plot structure, character arcs, pacing, voice, and more.
            </p>
          )}
          {aiStatus.data?.enabled && !aiStatus.data?.hasKey && (
            <p className="text-sm text-muted-foreground">
              Add an API key in{' '}
              <a href="/settings/ai" className="text-primary hover:underline">Settings → AI Keys</a>{' '}
              to enable AI analysis.
            </p>
          )}
          {aiCritique.error && (
            <p className="text-sm text-destructive">{aiCritique.error.message}</p>
          )}
          {aiCritique.isPending && (
            <p className="text-sm text-muted-foreground">Sending manuscript to AI for review… this may take 30–60 seconds.</p>
          )}
          {aiCritique.data && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={cn('text-4xl font-bold tabular-nums', scoreTone(aiCritique.data.score))}>
                    {aiCritique.data.score}
                  </div>
                  <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">AI score</div>
                </div>
                <p className="flex-1 text-sm text-muted-foreground">{aiCritique.data.summary}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {aiCritique.data.findings.map((f) => (
                  <div key={f.category} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{f.label}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.info)}>
                        {SEVERITY_LABEL[f.severity] ?? f.severity}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.guidance}</p>
                    {f.examples.length > 0 && (
                      <>
                        <button
                          className="mt-2 text-xs font-medium text-primary hover:underline"
                          onClick={() => setAiOpen(aiOpen === f.category ? null : f.category)}
                        >
                          {aiOpen === f.category ? 'Hide examples' : `Show examples (${f.examples.length})`}
                        </button>
                        {aiOpen === f.category && (
                          <ul className="mt-2 space-y-1.5">
                            {f.examples.map((ex, i) => (
                              <li key={i} className="rounded bg-muted/50 p-2 text-xs italic">{ex}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { aiCritique.reset(); setFocusAreas(''); }}
              >
                Run again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
