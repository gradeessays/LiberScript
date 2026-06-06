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
- **Turbopack dev** (`next dev --turbopack`): route compiles drop from ~10–25s
  (Webpack, on demand) to ~1–2s. The single biggest local-UX win. `next build`
  stays on Webpack (stable).
- **Session cookie cache** (better-auth `session.cookieCache`, 5 min): `getSession`
  — run on **every** app page (server layout) and **every** tRPC request (context)
  — now reads a signed cookie instead of a DB round-trip. Huge when the DB is
  geographically distant (Neon us-east). Sign-out / changes still invalidate it.
- **Header uses one cached query**: the org switcher was calling two DB-heavy
  better-auth endpoints (`organization/list`, `get-full-organization`) on every
  page; it now reuses the cached `account.me` (shared with the dashboard) and only
  calls better-auth on an actual switch.
- **React Query**: `staleTime: 30s`, `gcTime: 5m`, `refetchOnWindowFocus: false`,
  and `retry: 1` (errors surface in ~1 try instead of long exponential backoff).
- **Debounced live preview** (~350ms) — no font re-fetch thrash.
- **Lazy editor**: TipTap loads only on the editor route (`next/dynamic`, ssr:false).

### Biggest production lever: DB latency
Most "slow" comes from **round-trip latency to Postgres**. Two rules:
- **Co-locate**: deploy the droplet in the **same region as Neon** (e.g. us-east).
  A 100–300ms round trip per query, multiplied across a page, dwarfs JS perf.
- Use Neon's **pooled** connection string (`-pooler` host) for the app and add
  `?connect_timeout=15`. Keep the direct host for migrations.
- For consistently restrictive networks, Neon's **serverless driver** (WebSocket
  over 443) via Prisma's driver adapter avoids port-5432 blocks and cold-start
  stalls.

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
