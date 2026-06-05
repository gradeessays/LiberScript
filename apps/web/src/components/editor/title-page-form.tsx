'use client';

import { useEffect, useState } from 'react';
import { Input, Label } from '@liberscript/ui';

export interface TitlePageData {
  title?: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
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

  const field = (key: keyof TitlePageData, label: string) => (
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

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        These fields render on the title page. Blank fields fall back to the book&apos;s metadata.
        Upload the publisher logo from <strong>Design &amp; preview</strong>.
      </p>
      {field('title', 'Title')}
      {field('subtitle', 'Subtitle')}
      {field('author', 'Author')}
      {field('publisher', 'Publisher / imprint')}
    </div>
  );
}
