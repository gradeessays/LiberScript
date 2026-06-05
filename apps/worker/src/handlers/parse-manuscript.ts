import { parseManuscriptPayload } from '@liberscript/jobs';
import { prisma } from '@liberscript/db';
import { getObjectBuffer } from '@liberscript/storage';
import { chapterText, chapterToDoc, countWords, parseManuscript } from '@liberscript/analysis';
import { logger } from '../logger';

/**
 * Download an uploaded manuscript from storage, parse it into chapters + stats,
 * and persist a Manuscript with its Chapters (replacing any previous content).
 */
export async function handleParseManuscript(data: unknown): Promise<{ chapters: number }> {
  const { projectId, assetId } = parseManuscriptPayload.parse(data);

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error(`Asset ${assetId} not found`);

  const buffer = await getObjectBuffer(asset.storageKey);
  const parsed = await parseManuscript(buffer, asset.fileName);
  logger.info(
    { projectId, format: parsed.sourceFormat, chapters: parsed.chapters.length },
    'manuscript parsed',
  );

  await prisma.$transaction(async (tx) => {
    const manuscript = await tx.manuscript.upsert({
      where: { projectId },
      create: {
        projectId,
        sourceFormat: parsed.sourceFormat,
        wordCount: parsed.stats.wordCount,
        charCount: parsed.stats.charCount,
        readingMinutes: parsed.stats.readingMinutes,
      },
      update: {
        sourceFormat: parsed.sourceFormat,
        wordCount: parsed.stats.wordCount,
        charCount: parsed.stats.charCount,
        readingMinutes: parsed.stats.readingMinutes,
      },
    });

    // Replace existing chapters with the freshly parsed set.
    await tx.chapter.deleteMany({ where: { manuscriptId: manuscript.id } });
    await tx.chapter.createMany({
      data: parsed.chapters.map((chapter, index) => ({
        manuscriptId: manuscript.id,
        title: chapter.title,
        subtitle: chapter.subtitle ?? null,
        order: index,
        content: chapterToDoc(chapter) as object,
        wordCount: countWords(`${chapter.title} ${chapter.subtitle ?? ''} ${chapterText(chapter)}`),
      })),
    });
  });

  return { chapters: parsed.chapters.length };
}
