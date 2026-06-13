import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { type AiProvider, createId, detectFormat, MAX_UPLOAD_BYTES, planLimitExceeded } from '@liberscript/core';
import { chapterText, parseManuscript } from '@liberscript/analysis';
import { buildAssetKey, getObjectBuffer, presignUpload } from '@liberscript/storage';
import type { Prisma } from '@liberscript/db';
import { protectedProcedure, router } from '../trpc';
import { currentOwner, requireCreateAccess } from '../lib/ownership';
import { resolvePlanLimits } from '../lib/plan';
import { decryptApiKey } from '../lib/crypto';
import { generateAiText } from '../lib/ai-client';
import { buildStyleProfilePrompt, type StyleProfileSummary } from '../lib/ai-prompts';

/** How much of a reference manuscript to send for voice extraction. */
const EXCERPT_WORD_LIMIT = 6000;

export const styleProfileRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    return ctx.prisma.styleProfile.findMany({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }),

  /** Reserve an Asset for a reference manuscript and return a presigned upload URL. */
  create: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1).max(120),
        sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = await requireCreateAccess(ctx);
      const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);
      if (!limits.aiEnabled) {
        throw planLimitExceeded('Style profiles require a Pro or Team plan with an AI key configured.');
      }
      if (!detectFormat(input.fileName)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Unsupported file type. Use DOCX, EPUB, PDF, Markdown, or TXT.',
        });
      }

      const assetId = createId('asset');
      const storageKey = buildAssetKey({
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        assetId,
        fileName: input.fileName,
      });

      await ctx.prisma.asset.create({
        data: {
          id: assetId,
          storageKey,
          fileName: input.fileName,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          uploaded: false,
          createdById: ctx.user.id,
        },
      });

      const uploadUrl = await presignUpload({ key: storageKey, contentType: input.contentType });
      return { assetId, uploadUrl };
    }),

  /**
   * Confirm a completed upload and synchronously extract a tone/voice summary
   * via the owner's BYO AI key, creating the StyleProfile.
   */
  confirm: protectedProcedure
    .input(z.object({ assetId: z.string(), name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const owner = await requireCreateAccess(ctx);
      const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);
      if (!limits.aiEnabled) {
        throw planLimitExceeded('Style profiles require a Pro or Team plan with an AI key configured.');
      }

      const asset = await ctx.prisma.asset.findUnique({ where: { id: input.assetId } });
      const prefix = `${owner.ownerType.toLowerCase()}/${owner.ownerId}/`;
      if (!asset || !asset.storageKey.startsWith(prefix)) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Upload not found.' });
      }

      const apiKey = await ctx.prisma.apiKey.findFirst({
        where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
        orderBy: { createdAt: 'desc' },
      });
      if (!apiKey) {
        throw planLimitExceeded('No AI API key configured. Add one in Settings → AI Keys.');
      }

      await ctx.prisma.asset.update({ where: { id: asset.id }, data: { uploaded: true } });

      const buffer = await getObjectBuffer(asset.storageKey);
      const parsed = await parseManuscript(buffer, asset.fileName);

      let excerpt = '';
      let words = 0;
      for (const chapter of parsed.chapters) {
        if (words >= EXCERPT_WORD_LIMIT) break;
        const text = chapterText(chapter);
        if (!text) continue;
        const chapterWords = text.split(/\s+/).filter(Boolean);
        const slice = chapterWords.slice(0, EXCERPT_WORD_LIMIT - words).join(' ');
        excerpt += `${excerpt ? '\n\n' : ''}${slice}`;
        words += Math.min(chapterWords.length, EXCERPT_WORD_LIMIT - words);
      }
      if (!excerpt) {
        throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: 'Could not extract any text from this file.' });
      }

      const decryptedKey = decryptApiKey(apiKey.ciphertext, apiKey.iv, apiKey.authTag);
      const { systemPrompt, userPrompt } = buildStyleProfilePrompt(excerpt);
      const raw = await generateAiText({
        provider: apiKey.provider as AiProvider,
        decryptedKey,
        systemPrompt,
        userPrompt,
      });

      const clean = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      let summary: StyleProfileSummary;
      try {
        summary = JSON.parse(clean) as StyleProfileSummary;
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to extract a style summary from this file. Try a different file or AI provider.',
        });
      }

      return ctx.prisma.styleProfile.create({
        data: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          createdById: ctx.user.id,
          name: input.name,
          summary: summary as unknown as Prisma.InputJsonValue,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owner = currentOwner(ctx);
      const profile = await ctx.prisma.styleProfile.findUnique({ where: { id: input.id } });
      if (!profile || profile.ownerType !== owner.ownerType || profile.ownerId !== owner.ownerId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Style profile not found.' });
      }
      await ctx.prisma.styleProfile.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
