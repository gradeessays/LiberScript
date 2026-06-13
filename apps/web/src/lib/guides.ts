import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/guides');

export const GUIDE_CATEGORIES = {
  comparisons: 'LiberScript vs. other tools',
  kdp: 'KDP self-publishing',
  fundamentals: 'Indie publishing fundamentals',
  platforms: 'Platform monetization',
  design: 'Formatting, design & craft',
  marketing: 'Marketing & strategy',
} as const;

export type GuideCategory = keyof typeof GUIDE_CATEGORIES;

export const GUIDE_CATEGORY_ORDER = Object.keys(GUIDE_CATEGORIES) as GuideCategory[];

export interface GuideFrontmatter {
  title: string;
  description: string;
  category: GuideCategory;
  keywords: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface GuideSummary extends GuideFrontmatter {
  slug: string;
}

function readGuideFiles(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith('.mdx'));
}

export function getGuideSlugs(): string[] {
  return readGuideFiles().map((file) => file.replace(/\.mdx$/, ''));
}

export function getAllGuides(): GuideSummary[] {
  return readGuideFiles()
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      const { data } = matter(raw);
      return { ...(data as GuideFrontmatter), slug: file.replace(/\.mdx$/, '') };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getGuideRaw(slug: string): string {
  return fs.readFileSync(path.join(CONTENT_DIR, `${slug}.mdx`), 'utf-8');
}

export function getGuidesByCategory(category: GuideCategory, excludeSlug?: string, limit?: number): GuideSummary[] {
  const guides = getAllGuides().filter((guide) => guide.category === category && guide.slug !== excludeSlug);
  return limit ? guides.slice(0, limit) : guides;
}
