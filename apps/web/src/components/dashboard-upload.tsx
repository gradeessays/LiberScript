'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

type Phase = 'idle' | 'creating' | 'uploading' | 'parsing' | 'error';

/**
 * One-step upload: creates the project (named from the file), uploads the file,
 * and queues parsing. The worker then auto-detects the real title/author and
 * classifies every section (title page, copyright, chapters, epilogue, …).
 */
export function DashboardUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const createProject = trpc.project.create.useMutation();
  const createUpload = trpc.upload.create.useMutation();
  const confirmUpload = trpc.upload.confirm.useMutation();

  async function onFile(file: File) {
    setError(null);
    try {
      setPhase('creating');
      const stem = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
      const project = await createProject.mutateAsync({ title: stem });

      setPhase('uploading');
      const { assetId, uploadUrl } = await createUpload.mutateAsync({
        projectId: project.id,
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
      await confirmUpload.mutateAsync({ assetId });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setPhase('error');
    }
  }

  const busy = phase === 'creating' || phase === 'uploading' || phase === 'parsing';
  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.epub,.pdf,.md,.markdown,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {phase === 'creating'
          ? 'Creating…'
          : phase === 'uploading'
            ? 'Uploading…'
            : phase === 'parsing'
              ? 'Detecting sections…'
              : 'Upload a manuscript'}
      </Button>
      <p className="text-xs text-muted-foreground">
        DOCX, EPUB, PDF, Markdown, or TXT — we auto-detect the title, author, and all sections.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
