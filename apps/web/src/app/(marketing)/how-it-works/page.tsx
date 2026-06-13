import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonVariants } from '@liberscript/ui';

export const metadata: Metadata = {
  title: 'How it works | LiberScript',
  description:
    'A closer look at how LiberScript takes a manuscript from import or first draft through critique, design, and export to EPUB, print PDF, and DOCX.',
};

const STEPS = [
  {
    title: 'Import or write',
    shot: 'Manuscript editor with detected chapter structure',
    body: [
      "Start by uploading a manuscript in DOCX, EPUB, PDF, Markdown, or plain text. LiberScript parses the file and detects its structure automatically: title page, copyright page, dedication, prologue, chapters, epilogue, and back matter each become their own section, rather than one long block of text.",
      "From there, every section is an editable block you can reorder, retitle, split, or merge. Paste text from anywhere and tag it as a heading, an epigraph, a scene break, or body text, and LiberScript applies the right styling automatically based on your chosen theme.",
      "If you're starting from a blank page, a new project gives you the same structure to build into: add a chapter, write, reorder, repeat. Autosave runs continuously in the background, so short writing sessions between other commitments are never lost.",
    ],
  },
  {
    title: 'Refine',
    shot: 'Critique report with chapter-by-chapter findings',
    body: [
      "Run the critique engine whenever you want a fresh perspective on the manuscript. Unlike a simple grammar checker, it analyzes the whole book at once and looks for patterns across chapters: passive voice, adverb overuse, filler words, clichés, and repeated phrases, each shown in context with the surrounding sentence.",
      "Pacing and dialogue balance are tracked chapter by chapter, so you can see how the rhythm of your book changes from the opening to the climax to the ending, and spot sections that drag or rush compared to the rest.",
      "Each pass produces a readiness score, giving you a concrete number to track across revisions. Work through findings at your own pace, dismiss the ones that don't apply to your style, and re-run the analysis after edits to see the score move.",
    ],
  },
  {
    title: 'Design',
    shot: 'Paginated print preview with running headers',
    body: [
      "Switch to design mode and choose a theme that fits your genre, then fine-tune the details: fonts, font sizes, line spacing, chapter heading styles, drop caps, and epigraph formatting. Premium themes and custom font uploads are available on every plan.",
      "The live preview shows your book as real, paginated spreads at your chosen trim size, with running headers and page numbers exactly as they will appear in the finished book. Toggle between print and ebook views to confirm both formats look right.",
      "Because the preview updates live, you can experiment freely: try a different font, a wider margin, or a new chapter-opener style, and see the result immediately instead of exporting a file just to check how it looks.",
    ],
  },
  {
    title: 'Export',
    shot: 'Export panel with EPUB, print PDF, DOCX, and cover formats',
    body: [
      "When the manuscript and design are ready, export everything from the same project: an EPUB for Amazon KDP, Apple Books, Kobo, and other digital stores; a print-ready PDF sized to your exact trim for KDP Print, IngramSpark, or another printer; a clean DOCX for editors, beta readers, or agents; and a press-ready cover PDF.",
      "Every export reflects your current design, so the interior and cover never drift out of sync. If you make changes later, re-export any format at no extra cost and with no limit on how many times you generate files.",
    ],
  },
];

const FORMATS: { category: string; items: string[] }[] = [
  { category: 'Import', items: ['DOCX', 'EPUB', 'PDF', 'Markdown', 'Plain text (TXT)'] },
  {
    category: 'Export',
    items: ['EPUB (digital stores)', 'Print PDF (any trim size)', 'DOCX', 'Cover PDF (press-ready)'],
  },
];

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">How LiberScript works</h1>
        <p className="mt-4 text-muted-foreground">
          LiberScript covers the full arc from manuscript to publish-ready files in one workspace. Here is what
          happens at each stage, in more detail than the quick overview on the home page.
        </p>
      </div>

      <div className="mt-14 space-y-16">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className={
              i % 2 === 1
                ? 'grid items-center gap-8 lg:grid-cols-2 lg:[&>*:first-child]:order-2'
                : 'grid items-center gap-8 lg:grid-cols-2'
            }
          >
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h2 className="font-display text-xl font-semibold sm:text-2xl">{step.title}</h2>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                {step.body.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </div>
            <ScreenshotPlaceholder label={step.shot} />
          </div>
        ))}
      </div>

      <section className="mt-16 border-t pt-12">
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight">Supported formats</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {FORMATS.map((group) => (
            <div key={group.category} className="rounded-lg border bg-background p-6">
              <h3 className="font-semibold">{group.category}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted-foreground">
          Every export format is available on every plan, with no watermark and no limit on how many times you
          generate files.
        </p>
      </section>

      <section className="mt-16 text-center">
        <h2 className="font-display text-xl font-semibold">See it on your own manuscript</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          A Day pass unlocks the full workflow above for 24 hours, enough to import a manuscript, run a critique,
          try a design theme, and export a finished file.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/get-started?plan=DAY" className={buttonVariants({ size: 'lg' })}>
            Get started
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
