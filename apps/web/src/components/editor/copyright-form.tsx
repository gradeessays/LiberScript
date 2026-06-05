'use client';

import { useEffect, useState } from 'react';
import { BookGenre, generateCopyright } from '@liberscript/core';
import { Button, Input, Label } from '@liberscript/ui';

export interface CopyrightData {
  genre?: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  year?: number;
  customText?: string;
}

const GENRES: { value: string; label: string }[] = [
  { value: BookGenre.FICTION, label: 'Fiction' },
  { value: BookGenre.NONFICTION, label: 'Non-fiction' },
  { value: BookGenre.SELFHELP, label: 'Self-help' },
  { value: BookGenre.POETRY, label: 'Poetry' },
  { value: BookGenre.CHILDRENS, label: "Children's" },
];

export function CopyrightForm({
  bookTitle,
  data,
  onSave,
}: {
  bookTitle: string;
  data: CopyrightData;
  onSave: (data: CopyrightData) => void;
}) {
  const [form, setForm] = useState<CopyrightData>(data);
  const [custom, setCustom] = useState(Boolean(data.customText));
  useEffect(() => {
    setForm(data);
    setCustom(Boolean(data.customText));
  }, [data]);

  const save = (next: CopyrightData) => {
    setForm(next);
    onSave(next);
  };

  const preview = generateCopyright({
    title: bookTitle,
    author: form.author,
    year: form.year,
    genre: (form.genre as BookGenre) || BookGenre.FICTION,
  });

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        A complete copyright &amp; disclaimer is generated for your genre — just fill the details.
        Font auto-fits to a single page. (Free plan adds a small Liberscript credit.)
      </p>

      {!custom ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="genre">Genre</Label>
              <select
                id="genre"
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.genre ?? BookGenre.FICTION}
                onChange={(e) => save({ ...form, genre: e.target.value })}
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={form.year ?? ''}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) || undefined })}
                onBlur={() => onSave(form)}
              />
            </div>
          </div>
          {(['author', 'publisher', 'isbn'] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={k} className="capitalize">
                {k === 'isbn' ? 'ISBN' : k}
              </Label>
              <Input
                id={k}
                value={form[k] ?? ''}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                onBlur={() => onSave(form)}
              />
            </div>
          ))}

          <div className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Preview</p>
            <p>{preview.copyrightLine}</p>
            <p>{preview.rightsLine}</p>
            {preview.disclaimer && <p>{preview.disclaimer}</p>}
            {form.publisher && <p>Published by {form.publisher}</p>}
            <p>ISBN: {form.isbn || '_____________'}</p>
          </div>

          <Button variant="ghost" size="sm" onClick={() => save({ ...form, customText: ' ' })}>
            Write my own instead
          </Button>
        </>
      ) : (
        <>
          <Label htmlFor="customText">Custom copyright &amp; disclaimer</Label>
          <textarea
            id="customText"
            className="min-h-48 w-full rounded-md border border-input bg-background p-3 text-sm"
            value={form.customText ?? ''}
            onChange={(e) => setForm({ ...form, customText: e.target.value })}
            onBlur={() => onSave(form)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustom(false);
              save({ ...form, customText: undefined });
            }}
          >
            Use the standard template
          </Button>
        </>
      )}
    </div>
  );
}
