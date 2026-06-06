import { parseManuscriptPayload } from '@liberscript/jobs';
import { prisma, type ChapterKind, type Prisma } from '@liberscript/db';
import { getObjectBuffer } from '@liberscript/storage';
import { chapterText, chapterToDoc, countWords, parseManuscript } from '@liberscript/analysis';
import { groupOfKind } from '@liberscript/core';
import { logger } from '../logger';

const GROUP_RANK: Record<string, number> = { front: 0, body: 1, back: 2 };

/** Re-order a manuscript's chapters into front → body → back, contiguous from 0. */
async function regroup(tx: Prisma.TransactionClient, manuscriptId: string) {
  const chapters = await tx.chapter.findMany({
    where: { manuscriptId },
    orderBy: { order: 'asc' },
    select: { id: true, kind: true },
  });
  const sorted = [...chapters].sort(
    (a, b) => (GROUP_RANK[groupOfKind(a.kind)] ?? 1) - (GROUP_RANK[groupOfKind(b.kind)] ?? 1),
  );
  // Two-phase to avoid unique (manuscriptId, order) collisions.
  await Promise.all(sorted.map((c, i) => tx.chapter.update({ where: { id: c.id }, data: { order: 1000 + i } })));
  await Promise.all(sorted.map((c, i) => tx.chapter.update({ where: { id: c.id }, data: { order: i } })));
}

/**
 * Download an uploaded manuscript from storage, parse it into chapters + stats,
 * and persist a Manuscript with its Chapters (replacing any previous content).
 */
export async function handleParseManuscript(data: unknown): Promise<{ chapters: number }> {
  const { projectId, assetId, mode } = parseManuscriptPayload.parse(data);

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
        wordCount: 0,
        charCount: 0,
        readingMinutes: 1,
      },
      update: { sourceFormat: parsed.sourceFormat },
    });

    // Replace clears the book first; append keeps it and adds after the last element.
    let baseOrder = 0;
    if (mode === 'replace') {
      await tx.chapter.deleteMany({ where: { manuscriptId: manuscript.id } });
    } else {
      const last = await tx.chapter.findFirst({
        where: { manuscriptId: manuscript.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      baseOrder = (last?.order ?? -1) + 1;
    }

    await tx.chapter.createMany({
      data: parsed.chapters.map((chapter, index) => ({
        manuscriptId: manuscript.id,
        kind: chapter.kind as ChapterKind,
        title: chapter.title,
        subtitle: chapter.subtitle ?? null,
        order: baseOrder + index,
        content: chapterToDoc(chapter) as object,
        data: (chapter.data ?? undefined) as Prisma.InputJsonValue | undefined,
        wordCount: countWords(`${chapter.title} ${chapter.subtitle ?? ''} ${chapterText(chapter)}`),
      })),
    });

    // Appended sections may include front/back matter — re-sort into proper order.
    if (mode === 'append') await regroup(tx, manuscript.id);

    // Recompute aggregate stats from the resulting chapter set.
    const all = await tx.chapter.findMany({
      where: { manuscriptId: manuscript.id },
      select: { wordCount: true },
    });
    const wordCount = all.reduce((s, c) => s + c.wordCount, 0);
    await tx.manuscript.update({
      where: { id: manuscript.id },
      data: {
        wordCount,
        charCount: manuscript.charCount + parsed.stats.charCount,
        readingMinutes: Math.max(1, Math.round(wordCount / 250)),
      },
    });

    // Auto-detected title/author only apply on a full (replace) import.
    if (mode === 'replace') {
      if (parsed.title) {
        await tx.project.update({ where: { id: projectId }, data: { title: parsed.title } });
      }
      if (parsed.author) {
        await tx.metadata.upsert({
          where: { projectId },
          create: { projectId, authorName: parsed.author },
          update: { authorName: parsed.author },
        });
      }
    }
  });

  return { chapters: parsed.chapters.length };
}
