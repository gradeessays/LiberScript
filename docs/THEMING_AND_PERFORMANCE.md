# Theming (light/dark) & Performance

## App theming — light / dark / system

Two distinct "themes" exist; don't conflate them:
1. **App UI theme** (the chrome) — light/dark/system.
2. **Book reading theme** (the manuscript preview) — light/sepia/dark for the
   ebook target, and always a paper surface for print.

### App UI — implemented (class strategy)
- Tailwind tokens are HSL CSS variables with a `.dark` override
  (`packages/ui/src/styles.css`, mirrored in `globals.css`); `darkMode: ['class']`.
- An **inline script in the root layout** sets `.dark` before paint (no flash),
  reading `localStorage.theme` then the OS `prefers-color-scheme`.
- `ThemeToggle` (header) flips the class + persists the choice.

**Best-practice options**
- *Current* lightweight no-dep approach is production-fine and is exactly what
  libraries do under the hood.
- For **system-aware, multi-theme** needs, adopt **`next-themes`**
  (`<ThemeProvider attribute="class" enableSystem>`) — handles SSR, system
  changes, and `forcedTheme` per-route. Drop-in over the current setup.
- Always drive colors from **CSS variables** (already done) so new themes are
  just another token set; never hard-code hex in components.

### Book reading theme — implemented
`renderBookDocument({ readingMode: 'light' | 'sepia' | 'dark' })` recolors the
ebook preview; the design panel exposes the toggle. Print is unaffected.

## Loading speed

### Implemented now
- **React Query caching**: `staleTime: 30s`, `gcTime: 5m`,
  `refetchOnWindowFocus: false` — kills redundant refetches while navigating
  editor/design/cover panels.
- **Debounced live preview**: the design & cover iframes update ~350ms after the
  last change (`useDebouncedValue`) instead of on every keystroke — no font
  re-fetch thrash.
- **`optimizePackageImports`** for `@liberscript/ui|format|core` → smaller bundles
  via better tree-shaking of named imports.

### Recommended next (as the app grows)
- **Code-split the editor**: `next/dynamic(() => import(... ManuscriptEditor), { ssr:false })`
  so TipTap (~the heaviest chunk) loads only when editing.
- **Virtualize long lists** (chapters/findings) with windowing.
- **Server Components + streaming** for read-mostly pages; keep tRPC for mutations
  and interactive data.
- **DB indexes**: hot query paths already indexed (`ownerType+ownerId`,
  `manuscriptId`, `chapterId`). Add as new query shapes appear; watch N+1s.
- **Images**: serve cover/logo via `next/image` (or Spaces + CDN) with sizes;
  cache presigned download URLs.
- **Fonts**: self-host the curated set with `next/font` (preload, no layout
  shift) instead of the Google CDN used in the preview iframe.
- **Pagination/lazy preview**: render the previewer in chunks (and paged.js only
  when the print view is opened) to keep big books snappy.
- **Edge/CDN** static assets; gzip/brotli (handled by the platform/proxy).
- **Worker offload**: keep parse/analyze/export off the request path (already so).
