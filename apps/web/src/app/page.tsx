import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonVariants } from '@liberscript/ui';

export const metadata: Metadata = {
  title: 'Liberscript — Write, critique, design & publish your book',
  description:
    'The all-in-one book studio: a structured manuscript editor, instant prose critique, professional print & ebook design, and one-click EPUB, PDF, and DOCX export.',
};

const PILLARS = [
  {
    title: 'Write with structure',
    body: 'Upload a draft and Liberscript detects every section — title page, copyright, prologue, chapters, epilogue. Or start blank and build the book element by element, with drag-to-reorder and instant autosave.',
    points: ['DOCX, EPUB, PDF, Markdown & TXT import', 'Auto-detected front & back matter', 'Tag pasted text as titles, quotes, headings'],
  },
  {
    title: 'Critique like an editor',
    body: 'A built-in manuscript analysis engine reads your whole book and flags what slows it down — with real examples from your own pages and a readiness score to track.',
    points: ['Passive voice, adverbs, filler & clichés', 'Readability, pacing & dialogue balance', 'Chapter-by-chapter breakdown'],
  },
  {
    title: 'Design & publish beautifully',
    body: 'Pick a theme, tune the typography, and watch a real paginated preview — running headers, page numbers, your exact trim size. Then export press-ready files in one click.',
    points: ['90+ chapter-start designs, full typography control', 'True print preview: pages & page-flip', 'EPUB, print PDF, DOCX & cover PDF export'],
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">Liberscript</span>
        <nav className="flex items-center gap-2">
          <Link href="/sign-in" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: 'sm' })}>
            Get started free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-14 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Your book, from first draft to bookstore-ready.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Liberscript is the all-in-one book studio: write and structure your manuscript, get an
          editor-grade critique, design a professional interior, and export print-ready files —
          all under one roof.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/sign-up" className={buttonVariants({ size: 'lg' })}>
            Start writing — it&apos;s free
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · Import an existing manuscript in seconds
        </p>
      </section>

      {/* Pillars */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-16 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-xl border bg-background p-6">
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      ✓
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">One flow, four steps</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1 · Import or write', 'Drop in a DOCX/EPUB/PDF and get a fully structured book, or start from a blank page.'],
            ['2 · Refine', 'Run the critique, tighten the prose, reorder sections — everything updates live.'],
            ['3 · Design', 'Themes, fonts, trim sizes, chapter styles, running headers — previewed as real pages.'],
            ['4 · Export', 'Download EPUB for stores, a paginated print PDF, DOCX, and a press-ready cover.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border p-5">
              <div className="text-sm font-semibold">{t}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/sign-up" className={buttonVariants({ size: 'lg' })}>
            Create your free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Liberscript</span>
          <span>Write · Critique · Design · Publish</span>
        </div>
      </footer>
    </main>
  );
}
