import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider } from '@liberscript/core';

export interface AiStreamParams {
  provider: AiProvider;
  decryptedKey: string;
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  /** Optional OpenRouter model override (e.g. "anthropic/claude-3-haiku") */
  openRouterModel?: string;
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  [AiProvider.OPENAI]: 'gpt-4o-mini',
  [AiProvider.ANTHROPIC]: 'claude-haiku-4-5-20251001',
  [AiProvider.GEMINI]: 'gemini-2.0-flash',
  [AiProvider.OPENROUTER]: 'anthropic/claude-haiku-4-5',
};

/**
 * Returns a ReadableStream that emits text chunks from the chosen AI provider.
 * All providers are normalized to the same streaming interface so callers don't
 * need to know which SDK is in use.
 */
export function streamAiText(params: AiStreamParams): ReadableStream<string> {
  const model = params.model ?? DEFAULT_MODELS[params.provider];

  switch (params.provider) {
    case AiProvider.OPENAI:
      return streamOpenAi(params.decryptedKey, model, params.systemPrompt, params.userPrompt);
    case AiProvider.OPENROUTER:
      return streamOpenAi(
        params.decryptedKey,
        params.openRouterModel ?? model,
        params.systemPrompt,
        params.userPrompt,
        'https://openrouter.ai/api/v1',
      );
    case AiProvider.ANTHROPIC:
      return streamAnthropic(params.decryptedKey, model, params.systemPrompt, params.userPrompt);
    case AiProvider.GEMINI:
      return streamGemini(params.decryptedKey, model, params.systemPrompt, params.userPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${params.provider}`);
  }
}

// ─── OpenAI + OpenRouter (same SDK, different base URL) ──────────────────────

function streamOpenAi(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  baseURL?: string,
): ReadableStream<string> {
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  return new ReadableStream<string>({
    async start(ctrl) {
      try {
        const stream = await client.chat.completions.create({
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) ctrl.enqueue(text);
        }
        ctrl.close();
      } catch (err) {
        ctrl.error(err);
      }
    },
  });
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

function streamAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): ReadableStream<string> {
  const client = new Anthropic({ apiKey });
  return new ReadableStream<string>({
    async start(ctrl) {
      try {
        const stream = await client.messages.create({
          model,
          max_tokens: 8192,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            ctrl.enqueue(event.delta.text);
          }
        }
        ctrl.close();
      } catch (err) {
        ctrl.error(err);
      }
    },
  });
}

// ─── Gemini (REST streaming) ──────────────────────────────────────────────────

function streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(ctrl) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          }),
        });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => res.statusText);
          ctrl.error(new Error(`Gemini API error ${res.status}: ${text}`));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
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
              const parsed = JSON.parse(json) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) ctrl.enqueue(text);
            } catch {
              // skip malformed SSE line
            }
          }
        }
        ctrl.close();
      } catch (err) {
        ctrl.error(err);
      }
    },
  });
}
