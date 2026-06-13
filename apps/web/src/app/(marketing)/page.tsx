import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonVariants, cn } from '@liberscript/ui';
import { PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { formatPrice } from '@/components/plan-grid';
import { ManuscriptEditorMockup, CritiqueReportMockup, PrintPreviewMockup } from '@/components/feature-mockups';

export const metadata: Metadata = {
  title: 'LiberScript: Write, critique, design, and publish your book',
  description:
    'LiberScript is the all-in-one studio for independent authors: a structured manuscript editor, editor-grade critique, professional print and ebook design, and one-click export to EPUB, PDF, and DOCX. Pay once, no subscription.',
};

const PILLARS = [
  {
    title: 'Write with structure',
    body: [
      "Most manuscripts don't start as a blank page. They start as a messy DOCX, a half-finished EPUB, or a stack of scenes spread across different files. Upload what you have and LiberScript automatically detects the structure: title page, copyright page, dedication, prologue, chapters, and back matter. Nothing gets flattened into one long document.",
      'From there, every section is its own block you can drag, reorder, retitle, or split. Paste text from anywhere and tag it as a heading, an epigraph, a scene break, or body text, and LiberScript applies the right styling automatically. Autosave runs constantly, so you can write in short bursts between other commitments without worrying about losing your place.',
      "If you're starting from nothing, a blank project gives you the same structure to build into. Add a chapter, write, reorder, repeat.",
    ],
    points: [
      'Import DOCX, EPUB, PDF, Markdown, and TXT',
      'Automatic front matter and back matter detection',
      'Drag-to-reorder chapters and scenes with instant autosave',
    ],
    shot: 'Manuscript editor with detected chapter structure',
    Mockup: ManuscriptEditorMockup,
  },
  {
    title: 'Critique like an editor',
    body: [
      "Once your manuscript is in LiberScript, the built-in analysis engine reads the whole thing, not just a paragraph at a time, and surfaces the patterns that are easy to miss when you've read your own book a dozen times.",
      'It flags overused adverbs, passive voice, filler words, clichés, and repeated phrases, and shows you exactly where each one appears with the surrounding sentence for context. Pacing and dialogue balance are tracked chapter by chapter, so you can see whether the back half of your book speeds up or drags compared to the front.',
      "Every pass produces a readiness score you can track across revisions, so you have a concrete way to watch your manuscript improve draft over draft, not just a vague feeling that it reads better now.",
    ],
    points: [
      'Passive voice, adverbs, filler words, and clichés',
      'Chapter-by-chapter pacing and dialogue balance',
      'A readiness score you can track across revisions',
    ],
    shot: 'Critique report with chapter-by-chapter findings',
    Mockup: CritiqueReportMockup,
  },
  {
    title: 'Design and export beautifully',
    body: [
      "A book's interior is part of the reading experience, and LiberScript treats it that way. Pick a genre-appropriate theme, then fine-tune typography: fonts, sizes, line spacing, chapter heading styles, drop caps, and epigraph formatting, all with a live, paginated preview that shows real page breaks, running headers, and page numbers at your exact trim size.",
      "Premium themes and custom font uploads are available on every plan, so your fantasy novel doesn't have to look like your business book.",
      'When the design is right, export EPUB for digital stores, a print-ready PDF sized to your chosen trim, a clean DOCX for collaborators, and a press-ready cover PDF, all generated from the same project so your interior and cover always match.',
    ],
    points: [
      '90+ chapter-start designs with full typography control',
      'True print preview: real pages, running headers, page numbers',
      'EPUB, print PDF, DOCX, and cover PDF export',
    ],
    shot: 'Paginated print preview with running headers',
    Mockup: PrintPreviewMockup,
  },
];

const BENEFITS = [
  {
    title: 'You own every file',
    body: "Every export, EPUB, PDF, DOCX, and cover, downloads straight to your computer. There's no proprietary format holding your manuscript hostage, and nothing you lose access to if you ever decide to move on.",
  },
  {
    title: 'Pay once, not monthly',
    body: "Every plan is a fixed-price pass, not a subscription. Buy the time you need, use it, and walk away. If you buy more time before your pass runs out, it stacks on top of what you already have.",
  },
  {
    title: 'Every export format, one click',
    body: 'EPUB for online stores, a paginated print PDF sized to your trim, a clean DOCX for editors and beta readers, and a press-ready cover PDF, all generated from the same manuscript.',
  },
  {
    title: 'Bring your own AI',
    body: 'Connect your own OpenAI, Anthropic, Gemini, or OpenRouter key for AI-assisted writing, critique suggestions, and KDP metadata tools. You control the provider and the cost.',
  },
  {
    title: 'Built around indie publishing',
    body: "From KDP categories to IngramSpark trim sizes, LiberScript's defaults and guides are built around the platforms independent authors actually use to publish and sell books.",
  },
  {
    title: 'Real editorial feedback',
    body: 'A manuscript-wide critique flags passive voice, filler words, pacing issues, and repetition, with real examples pulled from your own chapters, not generic advice.',
  },
];

const STEPS = [
  {
    title: 'Import or write',
    body: "Start by uploading a manuscript in DOCX, EPUB, PDF, Markdown, or plain text, and LiberScript parses it into a structured project: title page, front matter, chapters, and back matter, each as its own editable section. If you're starting fresh, create a blank project and build it section by section. Either way, you land in a distraction-free editor with autosave running in the background, so every change is captured as you write. You can reorder chapters, split or merge scenes, and adjust front and back matter at any point in your drafting and revision process, not just at import.",
  },
  {
    title: 'Refine',
    body: "Run the critique engine whenever you're ready for a fresh perspective. It scans your entire manuscript for passive voice, adverb overuse, filler words, clichés, repeated phrases, and pacing issues, and shows each finding in context with the surrounding sentence. Work through the findings at your own pace, dismiss the ones that don't apply, and re-run the analysis after edits to watch your readiness score move. Because the critique runs on the whole book, it catches patterns that are easy to miss when you're deep in a single chapter, like a tic word that only shows up under stress, or a section that suddenly slows the pacing down.",
  },
  {
    title: 'Design',
    body: 'Switch to design mode and choose a theme that matches your genre, then adjust typography: fonts, sizes, spacing, chapter heading styles, drop caps, and epigraph formatting. The live preview shows your book as real paginated spreads at your chosen trim size, with running headers and page numbers exactly as they will appear in print. Toggle between print and ebook views to make sure both formats look the way you want. Because the preview is live, you can experiment freely, try a different font, a wider margin, a new chapter-opener style, and see the result immediately instead of guessing and re-exporting each time.',
  },
  {
    title: 'Export',
    body: "When you're ready, export everything you need from the same project: an EPUB for Amazon KDP, Apple Books, Kobo, and other digital stores, a print-ready PDF sized to your exact trim for KDP Print, IngramSpark, or another printer, a clean DOCX for editors, beta readers, or agents, and a press-ready cover PDF. Every export reflects your current design, so there's no risk of your interior and cover drifting out of sync. Re-export any format any time your manuscript changes. There's no extra cost and no limit on how many times you generate files.",
  },
];

const PLAN_TEASERS: { interval: PlanInterval; body: string }[] = [
  {
    interval: PlanInterval.DAY,
    body: 'A full 24 hours of access. Ideal for trying LiberScript on your own manuscript, finishing a focused formatting pass, or producing a one-off export before a deadline.',
  },
  {
    interval: PlanInterval.WEEK,
    body: 'Seven days of access. A good fit for a focused editing sprint, or formatting and exporting a finished manuscript across multiple platforms.',
  },
  {
    interval: PlanInterval.MONTH,
    body: 'Thirty days of access. The most popular plan for authors actively drafting, revising, or designing a book from start to finish.',
  },
  {
    interval: PlanInterval.YEAR,
    body: 'A full year of access at the best per-day value. Suited to authors working on multiple books, or anyone who wants LiberScript available whenever inspiration strikes.',
  },
];

const FAQS = [
  {
    q: 'Do LiberScript plans auto-renew?',
    a: "No. Every plan is a one-time, fixed-price pass for a set amount of time: a day, a week, a month, or a year. There's no recurring billing and nothing to cancel. When your pass is close to running out, you'll see a reminder in your dashboard with a link to buy more time, and any new pass stacks on top of whatever time you have left.",
  },
  {
    q: 'What happens to my books if my pass expires?',
    a: "Your projects stay on your account for a short grace period after your pass ends, giving you time to reactivate and pick up exactly where you left off. If you'd rather keep a local copy, you can export your manuscript at any point while your pass is active, in EPUB, PDF, or DOCX, so your work is never trapped in LiberScript.",
  },
  {
    q: 'Which file formats can I import and export?',
    a: 'You can import DOCX, EPUB, PDF, Markdown, and plain text files, and LiberScript will detect the structure automatically. For export, every plan supports EPUB for digital stores, a paginated print PDF sized to your trim, a clean DOCX, and a press-ready cover PDF.',
  },
  {
    q: 'Do I need my own AI API key?',
    a: 'AI-assisted writing, critique suggestions, and KDP metadata tools use your own API key from OpenAI, Anthropic, Gemini, or OpenRouter. This keeps costs transparent and means you are never paying a markup on someone else’s API usage. The editor, structural critique, design, and export tools all work fully without any AI key.',
  },
  {
    q: 'Is the Day pass really enough to try LiberScript properly?',
    a: "Yes. A Day pass unlocks the entire toolkit for 24 hours, the same editor, critique engine, design tools, and export formats available on every other plan. It's a good way to import a manuscript, run a critique, try a design theme, and export a finished file before deciding on a longer plan.",
  },
  {
    q: 'Can I use LiberScript for KDP, IngramSpark, Draft2Digital, or Kobo?',
    a: "Yes. LiberScript's export formats and design defaults are built around the platforms independent authors actually publish on. Our guides walk through formatting requirements for KDP, IngramSpark, Draft2Digital, Kobo, Barnes & Noble Press, and Apple Books in detail.",
  },
  {
    q: 'Can I collaborate with a co-author or an editor?',
    a: 'Yes. Every plan supports unlimited collaborators on a project, so you can invite a co-author, editor, or beta reader to review and work in the same manuscript with you.',
  },
  {
    q: 'What if I have more questions?',
    a: 'Check the Guides and Resources section for in-depth walkthroughs on formatting, KDP, and indie publishing, or get in touch and we will get back to you. We read every message that comes in and use it to shape what we build next.',
  },
];

export default function HomePage() {
  const dayPricing = PLAN_PRICING[PlanInterval.DAY];

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Your manuscript deserves more than a word processor
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          LiberScript brings the entire self-publishing workflow into one calm, focused workspace. Import a
          manuscript or start from a blank page, get a structural critique that reads like an editor&apos;s notes,
          design a print and ebook interior with real pagination, and export EPUB, PDF, and DOCX files ready for
          Amazon KDP, IngramSpark, Draft2Digital, Kobo, and more. No software to install, no subscription to
          track, and nothing locked away if you stop: your files are always yours.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/get-started?plan=DAY" className={buttonVariants({ size: 'lg' })}>
            Start your day pass for {formatPrice(dayPricing.amountCents)}
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Try the full toolkit for 24 hours. No recurring charges, ever.
        </p>
      </section>

      {/* Trust / benefits strip */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Why authors choose LiberScript
            </h2>
            <p className="mt-3 text-muted-foreground">
              LiberScript was built around a simple idea: independent authors should not need five different
              subscriptions and a spreadsheet of passwords to publish a book.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-lg border bg-background p-5">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold-foreground">
                  ✓
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything a self-published book needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three stages, one workspace. Move between writing, critique, and design without exporting files back
            and forth between tools.
          </p>
        </div>
        <div className="mt-12 space-y-16">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.title}
              className={cn(
                'grid items-center gap-8 lg:grid-cols-2',
                i % 2 === 1 && 'lg:[&>*:first-child]:order-2',
              )}
            >
              <div>
                <h3 className="font-display text-xl font-semibold sm:text-2xl">{pillar.title}</h3>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {pillar.body.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {pillar.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span className="text-primary" aria-hidden>
                        ✓
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <pillar.Mockup label={pillar.shot} />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              One flow, four steps
            </h2>
            <p className="mt-3 text-muted-foreground">
              You do not need to learn a new toolchain. LiberScript walks you through the same four stages every
              published book goes through, in one continuous workspace.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-lg border bg-background p-6">
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/get-started" className={buttonVariants({ size: 'lg' })}>
              Create your account
            </Link>
          </div>
        </div>
      </section>

      {/* Founder's note */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Why we built LiberScript</h2>
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>
            We started LiberScript because we were tired of watching authors stitch together a publishing
            workflow out of five different tools: a word processor for drafting, a separate app for formatting,
            another subscription for editorial feedback, a design tool for covers, and a spreadsheet to keep
            track of which platform needed which file format.
          </p>
          <p>
            Each tool is fine on its own. Together, they are expensive, they do not talk to each other, and
            switching between them breaks your focus right when you need it most: in the middle of a revision, or
            the week before a launch.
          </p>
          <p>
            So we built one workspace that covers the whole arc: writing and structuring a manuscript, getting a
            structural critique, designing a print and ebook interior, and exporting every file format an
            independent author actually needs. We built it around bring-your-own AI, so you are never paying us a
            markup on someone else&apos;s API, and you stay in control of which provider you use.
          </p>
          <p>
            We also made a deliberate choice on pricing. Subscriptions make sense for tools you use every day,
            forever. Most authors do not write every day, forever. They write in seasons: an intense few weeks of
            drafting, a focused week of revisions, a final push before a deadline. So LiberScript is sold in
            passes, a day, a week, a month, or a year, paid once, with no auto-renewal and nothing to remember to
            cancel. Buy time when you need it, and walk away when you do not.
          </p>
          <p>
            We are still building. The roadmap is shaped directly by the authors using LiberScript day to day, and
            we read every piece of feedback that comes in. If there is something that would make your workflow
            better, we want to hear about it.
          </p>
          <p className="font-display text-foreground">The LiberScript team</p>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Pricing that matches how you write
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every LiberScript plan unlocks the exact same toolkit: unlimited books, every export format, the
              full critique engine, premium themes, and BYO-AI tools. The only difference between plans is how
              much time you get. There is no feature gate to hit and no upsell waiting halfway through a project.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_TEASERS.map(({ interval, body }) => {
              const pricing = PLAN_PRICING[interval];
              return (
                <div key={interval} className="rounded-lg border bg-background p-5">
                  <p className="font-display text-2xl font-semibold">{formatPrice(pricing.amountCents)}</p>
                  <p className="text-sm font-medium">{pricing.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              View full pricing and features
            </Link>
            <Link href="/get-started" className={buttonVariants({ size: 'lg' })}>
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
        </div>
        <div className="mt-8 space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-lg border bg-background p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden>
                  ⌄
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to finish your book?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Start with a Day pass for {formatPrice(dayPricing.amountCents)} and see your manuscript through the
            entire LiberScript workflow: import, critique, design, and export. If it fits how you write, a Week,
            Month, or Annual pass is one click away, and any time you have already paid for carries forward. No
            subscriptions, no auto-renewal, just the tools you need for as long as you need them.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/get-started?plan=DAY"
              className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10')}
            >
              Start your day pass
            </Link>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ size: 'lg', variant: 'ghost' }), 'text-primary-foreground hover:bg-primary-foreground/10')}
            >
              Compare all plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
