'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@liberscript/ui';
import { AiProvider } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const PROVIDER_LABELS: Record<string, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic (Claude)',
  GEMINI: 'Google Gemini',
  OPENROUTER: 'OpenRouter',
};

const PROVIDER_HINTS: Record<string, string> = {
  OPENAI: 'Starts with sk-…',
  ANTHROPIC: 'Starts with sk-ant-…',
  GEMINI: 'Google AI Studio API key',
  OPENROUTER: 'Starts with sk-or-…',
};

export default function AiSettingsPage() {
  const utils = trpc.useUtils();
  const status = trpc.ai.status.useQuery();
  const keys = trpc.ai.listKeys.useQuery();
  const setKey = trpc.ai.setKey.useMutation({ onSuccess: () => { void utils.ai.listKeys.invalidate(); void utils.ai.status.invalidate(); setForm({ provider: AiProvider.OPENAI, label: '', key: '' }); setShowKey(false); } });
  const deleteKey = trpc.ai.deleteKey.useMutation({ onSuccess: () => { void utils.ai.listKeys.invalidate(); void utils.ai.status.invalidate(); } });

  const [form, setForm] = useState<{ provider: AiProvider; label: string; key: string }>({ provider: AiProvider.OPENAI, label: '', key: '' });
  const [showKey, setShowKey] = useState(false);

  const aiEnabled = status.data?.enabled !== false;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your own API keys to enable AI-powered writing, generation, and editorial analysis.
          Keys are stored encrypted and never logged.
        </p>
      </div>

      {!aiEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">Pro feature</p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            AI writing tools are available on the Pro and Team plans. Upgrade to add your API keys
            and unlock generation, AI critique, and more.
          </p>
          <Button className="mt-3" size="sm">
            Upgrade to Pro
          </Button>
        </div>
      )}

      {/* Configured keys */}
      {aiEnabled && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Configured keys
          </h2>
          {keys.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : keys.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys added yet.</p>
          ) : (
            <ul className="space-y-2">
              {keys.data?.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <span className="font-medium">{PROVIDER_LABELS[k.provider] ?? k.provider}</span>
                    {k.label && <span className="ml-2 text-sm text-muted-foreground">{k.label}</span>}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">····{k.last4}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remove the ${PROVIDER_LABELS[k.provider] ?? k.provider} key?`))
                          deleteKey.mutate({ id: k.id });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Add key form */}
      {aiEnabled && (
        <div className="space-y-4 rounded-lg border p-5">
          <h2 className="font-medium">Add API key</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as AiProvider }))}
              >
                {Object.values(AiProvider).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABELS[p] ?? p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g. personal, work"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <p className="text-xs text-muted-foreground">{PROVIDER_HINTS[form.provider]}</p>
            <div className="flex gap-2">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your API key here"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setShowKey((s) => !s)}
              >
                {showKey ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
          {setKey.error && (
            <p className="text-sm text-destructive">{setKey.error.message}</p>
          )}
          <Button
            onClick={() => setKey.mutate(form)}
            disabled={!form.key.trim() || setKey.isPending}
          >
            {setKey.isPending ? 'Saving…' : 'Save key'}
          </Button>
        </div>
      )}

      {/* Provider help */}
      {aiEnabled && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Where to get your key</p>
          <ul className="list-disc space-y-1 pl-4">
            <li><strong>OpenAI</strong> — platform.openai.com → API keys</li>
            <li><strong>Anthropic (Claude)</strong> — console.anthropic.com → API keys</li>
            <li><strong>Google Gemini</strong> — aistudio.google.com → Get API key</li>
            <li><strong>OpenRouter</strong> — openrouter.ai → Keys (access 200+ models with one key)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
