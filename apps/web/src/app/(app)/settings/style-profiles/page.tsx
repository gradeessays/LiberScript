'use client';

import { useRef, useState } from 'react';
import { Button, Input, Label } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

interface StyleProfileSummary {
  tone?: string;
  voice?: string;
  pacing?: string;
  vocabulary?: string;
  themes?: string[];
  styleNotes?: string;
}

type Phase = 'idle' | 'uploading' | 'analyzing';

export default function StyleProfilesSettingsPage() {
  const utils = trpc.useUtils();
  const status = trpc.ai.status.useQuery();
  const profiles = trpc.styleProfile.list.useQuery();
  const createUpload = trpc.styleProfile.create.useMutation();
  const confirmUpload = trpc.styleProfile.confirm.useMutation();
  const deleteProfile = trpc.styleProfile.delete.useMutation({
    onSuccess: () => void utils.styleProfile.list.invalidate(),
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const aiEnabled = status.data?.enabled ?? false;

  async function onFile(file: File) {
    if (!name.trim()) {
      setError('Give this style profile a name first.');
      return;
    }
    setError(null);
    setPhase('uploading');
    try {
      const { assetId, uploadUrl } = await createUpload.mutateAsync({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      const put = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error('Upload failed. Please try again.');

      setPhase('analyzing');
      await confirmUpload.mutateAsync({ assetId, name: name.trim() });
      setName('');
      void utils.styleProfile.list.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setPhase('idle');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Style Profiles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a previous book (or any reference manuscript) to extract its tone, voice, and
          pacing. Apply a profile in the AI Book Generator or to an existing project so new
          chapters match that established style.
        </p>
      </div>

      {!aiEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">Pro feature</p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            Style profiles require a Pro or Team plan with an AI key configured in{' '}
            <a href="/settings/ai" className="underline">
              Settings → AI Keys
            </a>
            .
          </p>
        </div>
      )}

      {aiEnabled && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your style profiles
          </h2>
          {profiles.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : profiles.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No style profiles yet.</p>
          ) : (
            <ul className="space-y-2">
              {profiles.data?.map((p) => {
                const summary = (p.summary ?? {}) as StyleProfileSummary;
                return (
                  <li key={p.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{p.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete the "${p.name}" style profile?`)) {
                            deleteProfile.mutate({ id: p.id });
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {summary.tone && <p><span className="font-medium text-foreground">Tone:</span> {summary.tone}</p>}
                      {summary.voice && <p><span className="font-medium text-foreground">Voice:</span> {summary.voice}</p>}
                      {summary.pacing && <p><span className="font-medium text-foreground">Pacing:</span> {summary.pacing}</p>}
                      {summary.vocabulary && <p><span className="font-medium text-foreground">Vocabulary:</span> {summary.vocabulary}</p>}
                      {Array.isArray(summary.themes) && summary.themes.length > 0 && (
                        <p><span className="font-medium text-foreground">Themes:</span> {summary.themes.join(', ')}</p>
                      )}
                      {summary.styleNotes && <p><span className="font-medium text-foreground">Style notes:</span> {summary.styleNotes}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {aiEnabled && (
        <div className="space-y-4 rounded-lg border p-5">
          <h2 className="font-medium">Add a style profile</h2>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="e.g. The Midnight Garden series"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,.epub,.pdf,.md,.markdown,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              if (inputRef.current) inputRef.current.value = '';
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={phase !== 'idle'}>
            {phase === 'uploading'
              ? 'Uploading…'
              : phase === 'analyzing'
                ? 'Analyzing style…'
                : 'Upload reference book'}
          </Button>
          <p className="text-xs text-muted-foreground">
            DOCX, EPUB, PDF, Markdown, or TXT. Analysis runs immediately using your configured AI
            key and may take a minute for longer books.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
