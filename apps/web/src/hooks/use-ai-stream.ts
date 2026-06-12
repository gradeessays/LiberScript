'use client';

import { useState, useCallback } from 'react';

interface StreamParams {
  projectId: string;
  chapterId?: string;
  mode: 'continue' | 'chapter' | 'outline' | 'rewrite' | 'ai-critique' | 'kdp-metadata';
  prompt: string;
  context?: string;
  selection?: string;
  bookTitle?: string;
  bookGenre?: string;
  /** Genre-filtered BISAC categories the model may choose from (kdp-metadata mode). */
  categoryOptions?: { code: string; label: string }[];
  /** Style profile to adopt. Falls back to the project's saved style profile. */
  styleProfileId?: string;
}

interface StreamState {
  text: string;
  streaming: boolean;
  error: string | null;
}

export function useAiStream() {
  const [state, setState] = useState<StreamState>({ text: '', streaming: false, error: null });

  const run = useCallback(async (params: StreamParams) => {
    setState({ text: '', streaming: true, error: null });
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => `Error ${res.status}`);
        setState({ text: '', streaming: false, error: msg });
        return;
      }
      if (!res.body) {
        setState({ text: '', streaming: false, error: 'No response body.' });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const parsed = JSON.parse(json) as { text?: string; error?: string };
            if (parsed.error) {
              setState((s) => ({ ...s, streaming: false, error: parsed.error! }));
              return;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setState({ text: accumulated, streaming: true, error: null });
            }
          } catch {
            // skip malformed line
          }
        }
      }
      setState({ text: accumulated, streaming: false, error: null });
    } catch (err) {
      setState({ text: '', streaming: false, error: String(err) });
    }
  }, []);

  const reset = useCallback(() => setState({ text: '', streaming: false, error: null }), []);

  return { ...state, run, reset };
}
