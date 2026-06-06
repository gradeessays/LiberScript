'use client';

import { useRef, useState } from 'react';
import { Button } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

type Mode = 'append' | 'replace';

/**
 * Upload a manuscript straight into the open book. Asks Append vs. Replace each
 * time, then parses in place; the caller refreshes once sections are detected.
 */
export function EditorUpload({ projectId, onParsed }: { projectId: string; onParsed: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mode = useRef<Mode>('append');
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'parsing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const createUpload = trpc.upload.create.useMutation();
  const confirmUpload = trpc.upload.confirm.useMutation();

  function pick(m: Mode) {
    mode.current = m;
    setOpen(false);
    inputRef.current?.click();
  }

  async function onFile(file: File) {
    setError(null);
    try {
      setPhase('uploading');
      const { assetId, uploadUrl } = await createUpload.mutateAsync({
        projectId,
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
      setPhase('parsing');
      await confirmUpload.mutateAsync({ assetId, mode: mode.current });
      // Parsing runs on the worker; give it a moment, then refresh the outline.
      setTimeout(() => {
        onParsed();
        setPhase('idle');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setPhase('error');
    }
  }

  const busy = phase === 'uploading' || phase === 'parsing';
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.epub,.pdf,.md,.markdown,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
      <Button variant="outline" size="sm" disabled={busy} onClick={() => setOpen((o) => !o)}>
        {phase === 'uploading' ? 'Uploading…' : phase === 'parsing' ? 'Detecting…' : 'Upload'}
      </Button>
      {open && !busy && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border bg-background p-1 shadow-md">
            <button
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => pick('append')}
            >
              Append a file
              <span className="block text-[11px] text-muted-foreground">Add its sections after this book</span>
            </button>
            <button
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => pick('replace')}
            >
              Replace with a file
              <span className="block text-[11px] text-muted-foreground">Clear this book and import fresh</span>
            </button>
          </div>
        </>
      )}
      {error && <p className="absolute right-0 mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
