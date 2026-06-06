import { generateExportPayload } from '@liberscript/jobs';
import { prisma, type ExportFormat } from '@liberscript/db';
import { getObjectBuffer, putObjectBuffer } from '@liberscript/storage';
import {
  KDP_TRIM_SIZES,
  PLAN_LIMITS,
  PlanTier,
  slugify,
  type TypographyOverrides,
} from '@liberscript/core';
import {
  buildCoverPdf,
  buildDocx,
  buildEpub,
  type ExportBook,
  type ExportCover,
} from '@liberscript/exports';
import type { Binding, PaperType } from '@liberscript/format';
import { logger } from '../logger';

const FILE_META: Record<string, { ext: string; contentType: string }> = {
  EPUB: { ext: 'epub', contentType: 'application/epub+zip' },
  DOCX: { ext: 'docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  COVER_PDF: { ext: 'pdf', contentType: 'application/pdf' },
};

function imageType(key: string): 'png' | 'jpg' {
  return /\.jpe?g$/i.test(key) ? 'jpg' : 'png';
}

async function loadImage(key?: string): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' } | undefined> {
  if (!key) return undefined;
  const buf = await getObjectBuffer(key);
  return { bytes: new Uint8Array(buf), type: imageType(key) };
}

interface CoverData {
  frontImageStorageKey?: string;
  backgroundImageStorageKey?: string;
  frontFullBleed?: boolean;
  frontScale?: number;
  frontPosX?: number;
  frontPosY?: number;
  dominantColor?: string;
  spineColor?: string;
  textColor?: string;
  backText?: string;
  spineText?: string;
  paper?: PaperType;
  pageCount?: number;
  trimKey?: string;
  binding?: Binding;
}

/** Build the requested export, store it, and record the artifact. */
export async function handleGenerateExport(data: unknown): Promise<{ storageKey: string }> {
  const { exportJobId } = generateExportPayload.parse(data);

  const job = await prisma.exportJob.findUnique({ where: { id: exportJobId } });
  if (!job) throw new Error(`Export job ${exportJobId} not found`);

  await prisma.exportJob.update({
    where: { id: exportJobId },
    data: { status: 'RUNNING', startedAt: new Date(), error: null },
  });

  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: job.projectId },
      include: {
        manuscript: { include: { chapters: { orderBy: { order: 'asc' } } } },
        metadata: true,
      },
    });
    const sub = await prisma.subscription.findUnique({
      where: { ownerType_ownerId: { ownerType: project.ownerType, ownerId: project.ownerId } },
    });
    const watermark = !PLAN_LIMITS[(sub?.tier as PlanTier) ?? PlanTier.FREE].removeWatermark;
    const formatting = (project.formatting ?? {}) as {
      author?: string;
      publisherName?: string;
      typography?: TypographyOverrides;
    };

    const meta = FILE_META[job.format] ?? FILE_META.EPUB!;
    const fileName = `${slugify(project.title) || 'book'}.${meta.ext}`;
    const storageKey = `${project.ownerType.toLowerCase()}/${project.ownerId}/exports/${exportJobId}.${meta.ext}`;

    let bytes: Uint8Array;
    if (job.format === ('COVER_PDF' as ExportFormat)) {
      const cover = (project.cover ?? {}) as CoverData;
      const trim = KDP_TRIM_SIZES.find((t) => t.key === cover.trimKey) ?? { widthIn: 6, heightIn: 9 };
      const [front, background] = await Promise.all([
        loadImage(cover.frontImageStorageKey),
        loadImage(cover.backgroundImageStorageKey),
      ]);
      const input: ExportCover = {
        title: project.title,
        author: project.metadata?.authorName ?? formatting.author,
        trimWidthIn: trim.widthIn,
        trimHeightIn: trim.heightIn,
        pageCount: cover.pageCount ?? 0,
        paper: cover.paper ?? 'white',
        binding: cover.binding ?? 'paperback',
        dominantColor: cover.dominantColor ?? '#334155',
        spineColor: cover.spineColor,
        textColor: cover.textColor,
        backText: cover.backText,
        spineText: cover.spineText,
        frontFullBleed: cover.frontFullBleed,
        frontScale: cover.frontScale,
        frontPosX: cover.frontPosX,
        frontPosY: cover.frontPosY,
        frontImage: front?.bytes,
        frontImageType: front?.type,
        backgroundImage: background?.bytes,
        backgroundImageType: background?.type,
      };
      bytes = await buildCoverPdf(input);
    } else {
      const book: ExportBook = {
        title: project.title,
        author: project.metadata?.authorName ?? formatting.author,
        publisher: formatting.publisherName,
        isbn: project.metadata?.isbn ?? undefined,
        language: project.metadata?.language ?? 'en',
        themeKey: project.themeKey,
        typography: formatting.typography,
        watermark,
        elements: (project.manuscript?.chapters ?? []).map((c) => ({
          kind: c.kind,
          title: c.title,
          subtitle: c.subtitle,
          data: c.data as Record<string, unknown> | null,
          content: c.content,
        })),
      };
      bytes = job.format === ('DOCX' as ExportFormat) ? await buildDocx(book) : await buildEpub(book);
    }

    await putObjectBuffer(storageKey, Buffer.from(bytes), meta.contentType);
    await prisma.$transaction([
      prisma.exportArtifact.deleteMany({ where: { exportJobId } }),
      prisma.exportArtifact.create({
        data: { exportJobId, storageKey, fileName, contentType: meta.contentType, sizeBytes: bytes.byteLength },
      }),
      prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: 'SUCCEEDED', completedAt: new Date() },
      }),
    ]);

    logger.info({ exportJobId, format: job.format, bytes: bytes.byteLength }, 'export complete');
    return { storageKey };
  } catch (err) {
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: { status: 'FAILED', error: err instanceof Error ? err.message : 'Export failed', completedAt: new Date() },
    });
    throw err;
  }
}
