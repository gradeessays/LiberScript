import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed global reference data. Idempotent (upserts) so it is safe to re-run.
 * Currently: publishing platform profiles used for metadata validation.
 */
const PLATFORM_PROFILES = [
  {
    key: 'kdp',
    name: 'Amazon KDP',
    rules: {
      titleMaxLength: 200,
      subtitleMaxLength: 200,
      maxKeywords: 7,
      keywordMaxLength: 50,
      maxCategories: 3,
      blurbMaxLength: 4000,
    },
  },
  {
    key: 'apple',
    name: 'Apple Books',
    rules: {
      titleMaxLength: 255,
      maxKeywords: 100,
      maxCategories: 2,
      blurbMaxLength: 4000,
    },
  },
  {
    key: 'kobo',
    name: 'Kobo Writing Life',
    rules: {
      titleMaxLength: 255,
      maxKeywords: 24,
      maxCategories: 3,
      blurbMaxLength: 5000,
    },
  },
  {
    key: 'ingramspark',
    name: 'IngramSpark',
    rules: {
      titleMaxLength: 255,
      maxKeywords: 7,
      maxCategories: 3,
      blurbMaxLength: 4000,
      requiresIsbn: true,
    },
  },
];

async function main() {
  for (const profile of PLATFORM_PROFILES) {
    await prisma.platformProfile.upsert({
      where: { key: profile.key },
      update: { name: profile.name, rules: profile.rules },
      create: profile,
    });
  }
  console.log(`Seeded ${PLATFORM_PROFILES.length} platform profiles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
