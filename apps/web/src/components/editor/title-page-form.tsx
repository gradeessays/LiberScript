'use client';

import { useEffect, useState } from 'react';
import { Input, Label } from '@liberscript/ui';
import { TITLE_PAGE_LAYOUTS } from '@liberscript/format';

export interface TitlePageData {
  title?: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  layout?: string;
}

export function TitlePageForm({
  data,
  onSave,
}: {
  data: TitlePageData;
  onSave: (data: TitlePageData) => void;
}) {
  const [form, setForm] = useState<TitlePageData>(data);
  useEffect(() => setForm(data), [data]);

  const field = (key: keyof Omit<TitlePageData, 'layout'>, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key] ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        onBlur={() => onSave(form)}
      />
    </div>
  );

  const setLayout = (key: string) => {
    const next = { ...form, layout: key };
    setForm(next);
    onSave(next);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        Blank text fields fall back to the book&apos;s metadata. Upload the publisher logo from{' '}
        <strong>Design &amp; preview</strong>.
      </p>

      {/* Layout picker */}
      <div className="space-y-1.5">
        <Label>Layout</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {TITLE_PAGE_LAYOUTS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLayout(l.key)}
              title={l.desc}
              className={`rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                (form.layout ?? 'classic') === l.key
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'hover:bg-accent'
              }`}
            >
              <span className="font-medium">{l.name}</span>
              <span className="block text-[10px] text-muted-foreground">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {field('title', 'Title')}
      {field('subtitle', 'Subtitle')}
      {field('author', 'Author')}
      {field('publisher', 'Publisher / imprint')}
    </div>
  );
}
