import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllGuides, GUIDE_CATEGORIES, GUIDE_CATEGORY_ORDER } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Guides & Resources | LiberScript',
  description:
    'Practical guides on self-publishing, KDP, indie author marketing, and how LiberScript compares to other book formatting tools.',
};

export default function GuidesIndexPage() {
  const guides = getAllGuides();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Guides &amp; resources</h1>
        <p className="mt-4 text-muted-foreground">
          Practical, in-depth guides on self-publishing, formatting, KDP, and marketing for independent authors,
          plus honest comparisons between LiberScript and other tools.
        </p>
      </div>

      <div className="mt-14 space-y-14">
        {GUIDE_CATEGORY_ORDER.map((category) => {
          const items = guides.filter((guide) => guide.category === category);
          if (items.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {GUIDE_CATEGORIES[category]}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {items.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="rounded-lg border bg-background p-5 transition-colors hover:border-primary"
                  >
                    <p className="font-medium">{guide.title}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{guide.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
