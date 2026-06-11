'use client';

import { useState } from 'react';
import { Button, cn } from '@liberscript/ui';
import { useAiStream } from '@/hooks/use-ai-stream';

type Mode = 'continue' | 'chapter' | 'rewrite';

interface Props {
  projectId: string;
  chapterId: string;
  /** Plain text of the current chapter content (for context). */
  contextText: string;
  /** Currently selected text in the editor (for rewrite mode). */
  selectionText?: string;
  bookTitle?: string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
  onClose: () => void;
}

const MODE_LABELS: Record<Mode, string> = {
  continue: 'Continue writing',
  chapter: 'Write from scratch',
  rewrite: 'Rewrite selection',
};

const MODE_PLACEHOLDERS: Record<Mode, string> = {
  continue: 'Any guidance for the continuation? (optional)',
  chapter: 'Describe what happens in this chapter…',
  rewrite: 'How should it be rewritten? (e.g. "more tension", "shorter sentences")',
};

export function AiPanel({
  projectId,
  chapterId,
  contextText,
  selectionText,
  bookTitle,
  onInsert,
  onReplace,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>(selectionText ? 'rewrite' : 'continue');
  const [prompt, setPrompt] = useState('');
  const { text, streaming, error, run, reset } = useAiStream();

  async function generate() {
    await run({
      projectId,
      chapterId,
      mode,
      prompt,
      context: contextText.slice(0, 8000),
      selection: mode === 'rewrite' ? selectionText : undefined,
      bookTitle,
    });
  }

  function insert() {
    if (!text) return;
    if (mode === 'rewrite') {
      onReplace(text);
    } else {
      onInsert(text);
    }
    reset();
    onClose();
  }

  return (
    <div className="border-t bg-background/98">
      <div className="px-4 py-3 space-y-3">
        {/* Mode tabs */}
        <div className="flex gap-1 rounded-md border p-0.5 text-xs w-fit">
          {(['continue', 'chapter', 'rewrite'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); reset(); }}
              className={cn(
                'rounded px-2.5 py-1',
                mode === m ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {mode === 'rewrite' && selectionText && (
          <p className="text-xs text-muted-foreground italic truncate max-w-lg">
            Selection: &ldquo;{selectionText.slice(0, 120)}{selectionText.length > 120 ? '…' : ''}&rdquo;
          </p>
        )}
        {mode === 'rewrite' && !selectionText && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Select text in the editor first, then use Rewrite.
          </p>
        )}

        {/* Prompt */}
        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            placeholder={MODE_PLACEHOLDERS[mode]}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate();
            }}
          />
          <Button
            size="sm"
            onClick={generate}
            disabled={streaming || (mode === 'chapter' && !prompt.trim()) || (mode === 'rewrite' && !selectionText)}
            className="self-end"
          >
            {streaming ? 'Writing…' : 'Generate'}
          </Button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Streamed output */}
        {(text || streaming) && (
          <div className="space-y-2">
            <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap [scrollbar-width:thin]">
              {text}
              {streaming && <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-middle" />}
            </div>
            {!streaming && text && (
              <div className="flex gap-2">
                <Button size="sm" onClick={insert}>
                  {mode === 'rewrite' ? 'Replace selection' : 'Insert into chapter'}
                </Button>
                <Button size="sm" variant="outline" onClick={reset}>
                  Discard
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
