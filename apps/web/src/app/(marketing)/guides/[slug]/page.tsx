import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import remarkGfm from 'remark-gfm';
import { compileMDX } from 'next-mdx-remote/rsc';
import { buttonVariants } from '@liberscript/ui';
import { getServerEnv } from '@liberscript/core';
import {
  getGuideRaw,
  getGuideSlugs,
  getGuidesByCategory,
  GUIDE_CATEGORIES,
  type GuideFrontmatter,
} from '@/lib/guides';

const MDX_OPTIONS = { mdxOptions: { remarkPlugins: [remarkGfm] }, parseFrontmatter: true };

export function generateStaticParams() {
  return getGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  let raw: string;
  try {
    raw = getGuideRaw(slug);
  } catch {
    return {};
  }

  const { frontmatter } = await compileMDX<GuideFrontmatter>({ source: raw, options: MDX_OPTIONS });
  const url = `${getServerEnv().APP_URL}/guides/${slug}`;

  return {
    title: `${frontmatter.title} | LiberScript`,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url,
      type: 'article',
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let raw: string;
  try {
    raw = getGuideRaw(slug);
  } catch {
    notFound();
  }

  const { content, frontmatter } = await compileMDX<GuideFrontmatter>({ source: raw, options: MDX_OPTIONS });
  const related = getGuidesByCategory(frontmatter.category, slug, 3);
  const url = `${getServerEnv().APP_URL}/guides/${slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt,
    author: { '@type': 'Organization', name: 'LiberScript' },
    publisher: { '@type': 'Organization', name: 'LiberScript' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/guides" className="text-sm font-medium text-primary hover:underline">
        ← Guides &amp; resources
      </Link>
      <p className="mt-4 text-sm font-medium text-primary">{GUIDE_CATEGORIES[frontmatter.category]}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{frontmatter.title}</h1>
      <p className="mt-4 text-muted-foreground">{frontmatter.description}</p>

      <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">{content}</div>

      {related.length > 0 && (
        <section className="mt-16 border-t pt-10">
          <h2 className="font-display text-xl font-semibold">Related guides</h2>
          <ul className="mt-4 space-y-2">
            {related.map((guide) => (
              <li key={guide.slug}>
                <Link href={`/guides/${guide.slug}`} className="text-sm font-medium text-primary hover:underline">
                  {guide.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 rounded-lg border bg-muted/30 p-8 text-center">
        <h2 className="font-display text-xl font-semibold">Ready to put this into practice?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          LiberScript brings writing, critique, design, and export into one workspace, with no subscription.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/get-started?plan=DAY" className={buttonVariants({ size: 'lg' })}>
            Start your day pass
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
