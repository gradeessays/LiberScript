import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonVariants } from '@liberscript/ui';

export const metadata: Metadata = {
  title: 'About | LiberScript',
  description:
    'LiberScript is a single workspace for independent authors: write, get a structural critique, design a print and ebook interior, and export every file you need to publish.',
};

const IS = [
  {
    title: 'An editor that understands books',
    body: 'Chapters, front matter, back matter, scenes, and epigraphs are all first-class blocks, not just paragraphs in a long document.',
  },
  {
    title: 'A whole-manuscript critique engine',
    body: 'It reads your entire book and flags passive voice, filler words, clichés, repetition, and pacing issues with examples from your own pages.',
  },
  {
    title: 'A real design tool',
    body: 'Themes, typography controls, and a live, paginated preview that shows your book as actual pages, at your chosen trim size.',
  },
  {
    title: 'A complete export pipeline',
    body: 'EPUB, print-ready PDF, DOCX, and a press-ready cover PDF, all generated from the same project so everything stays in sync.',
  },
  {
    title: 'Bring-your-own-AI',
    body: 'Connect your own OpenAI, Anthropic, Gemini, or OpenRouter key for AI-assisted writing, critique suggestions, and KDP metadata. You control the provider and the cost.',
  },
];

const IS_NOT = [
  {
    title: 'Not a marketplace or distributor',
    body: 'You still publish directly through Amazon KDP, IngramSpark, Draft2Digital, Kobo, Barnes & Noble Press, and similar platforms. LiberScript prepares the files; you control where they go.',
  },
  {
    title: 'Not a ghostwriting or editing service',
    body: 'The critique engine highlights patterns and suggests improvements. It does not write or rewrite your book for you, and it is not a substitute for a professional editor if your project needs one.',
  },
  {
    title: 'Not a literary agency',
    body: "We don't represent authors, take a percentage of royalties, or hold any rights to your work. Everything you write and upload remains yours.",
  },
  {
    title: 'Not a subscription',
    body: "Plans are fixed-price passes for a set amount of time, with no auto-renewal. There's nothing to remember to cancel.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">About LiberScript</h1>
      <p className="mt-4 text-muted-foreground">
        LiberScript is a single workspace for independent authors: write and structure a manuscript, get a
        structural critique, design a print and ebook interior, and export every file you need to publish. We
        built it because the standard self-publishing workflow asks authors to juggle too many separate tools and
        subscriptions.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">What we&apos;re building</h2>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <p>
            Self-publishing a book today usually means working across a word processor, a separate formatting
            tool, an editing or critique service, a cover design tool, and a handful of platform-specific export
            requirements. Each step works on its own, but switching between tools breaks your focus and adds up to
            several subscriptions a month, most of which sit unused between projects.
          </p>
          <p>
            LiberScript combines the four stages that matter most, writing, critique, design, and export, into one
            workspace, with simple pass-based pricing instead of a recurring subscription. You pay for the time you
            need and use the full toolkit for as long as your pass lasts.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">What LiberScript is</h2>
        <div className="mt-4 space-y-4">
          {IS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs text-gold-foreground">
                ✓
              </span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">What LiberScript isn&apos;t</h2>
        <div className="mt-4 space-y-4">
          {IS_NOT.map((item) => (
            <div key={item.title}>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-lg border bg-muted/30 p-6">
        <h2 className="font-display text-xl font-semibold">A note from the team</h2>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <p>
            We started LiberScript after watching, and living through, the same pattern over and over: a writer
            finishes a draft, then spends weeks bouncing between a word processor, a formatting tool, a critique
            service, and a cover designer just to get one finished book out the door. Each tool is reasonable on
            its own. Together, they are expensive, disconnected, and they pull your attention away from the book
            right when it matters most.
          </p>
          <p>
            We also believe pricing should match how authors actually work. Most people don&apos;t write every day,
            forever, they write in seasons: a sprint of drafting, a focused week of revisions, a final push before a
            deadline. That&apos;s why LiberScript is sold in passes, a day, a week, a month, or a year, paid once,
            with nothing to cancel.
          </p>
          <p>
            We&apos;re still building, and the roadmap is shaped directly by the authors using LiberScript. If
            there&apos;s something that would make your workflow better, we want to hear about it at{' '}
            <a href="mailto:support@liberscript.com" className="font-medium text-primary hover:underline">
              support@liberscript.com
            </a>
            .
          </p>
        </div>
      </section>

      <section className="mt-12 text-center">
        <h2 className="font-display text-xl font-semibold">Ready to start your book?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Every plan unlocks the full toolkit. Start with a Day pass to try it on your own manuscript.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/get-started" className={buttonVariants({ size: 'lg' })}>
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
