'use client';

import { useEffect, useState } from 'react';

/** Lightweight light/dark toggle (class strategy). Initial class is set by an
 * inline script in the root layout to avoid a flash of the wrong theme. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-md border px-2 py-1 text-sm hover:bg-accent"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
