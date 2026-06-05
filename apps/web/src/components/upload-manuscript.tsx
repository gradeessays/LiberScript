'use client';

import { useRef, useState } from 'react';
import { Button } from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

type Phase = 'idle' | 'uploading' | 'parsing' | 'error';

export function UploadManuscript({ projectId, onParsed }: { projectId: string; onParsed: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const createUpload = trpc.upload.create.useMutation();
  const confirmUpload = trpc.upload.confirm.useMutation();

  async function onFile(file: File) {
    setError(null);
    setPhase('uploading');
    try {
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
      await confirmUpload.mutateAsync({ assetId });
      // Parsing runs in the background worker; the project view polls for results.
      setPhase('idle');
      onParsed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setPhase('error');
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.epub,.pdf,.md,.markdown,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={phase === 'uploading' || phase === 'parsing'}
      >
        {phase === 'uploading'
          ? 'Uploading…'
          : phase === 'parsing'
            ? 'Queuing parse…'
            : 'Upload manuscript'}
      </Button>
      <p className="text-xs text-muted-foreground">DOCX, EPUB, PDF, Markdown, or TXT (max 50 MB).</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
