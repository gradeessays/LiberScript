import { z } from 'zod';
import { critiqueBook } from '@liberscript/analysis';
import { AiProvider, ChapterKind, planLimitExceeded, tiptapText, type TiptapDoc } from '@liberscript/core';
import { protectedProcedure, router } from '../trpc';
import { requireProjectAccess } from '../lib/ownership';
import { currentOwner } from '../lib/ownership';
import { resolvePlanLimits } from '../lib/plan';
import { decryptApiKey } from '../lib/crypto';
import { streamAiText } from '../lib/ai-client';

/** Sections whose prose participates in the critique (skip TOC, copyright…). */
const NARRATIVE_KINDS: ChapterKind[] = [
  ChapterKind.FOREWORD,
  ChapterKind.PREFACE,
  ChapterKind.PROLOGUE,
  ChapterKind.INTRODUCTION,
  ChapterKind.CHAPTER,
  ChapterKind.EPILOGUE,
  ChapterKind.AFTERWORD,
];

export const analysisRouter = router({
  /**
   * Deterministic manuscript critique over the book's narrative sections.
   * Pure-function NLP — fast enough to run synchronously on a full novel.
   */
  critique: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(ctx, input.projectId);
      const manuscript = await ctx.prisma.manuscript.findUnique({
        where: { projectId: input.projectId },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            select: { id: true, kind: true, title: true, content: true },
          },
        },
      });
      const chapters = (manuscript?.chapters ?? [])
        .filter((c) => NARRATIVE_KINDS.includes(c.kind as ChapterKind))
        .map((c) => ({
          id: c.id,
          title: c.title,
          text: tiptapText(c.content as unknown as TiptapDoc),
        }));
      return critiqueBook(chapters);
    }),

  /**
   * AI-powered editorial critique. Sends the manuscript to the configured AI
   * provider and returns structured developmental feedback as JSON.
   * Gated behind aiEnabled plan limit.
   */
  aiCritique: protectedProcedure
    .input(z.object({ projectId: z.string(), focusAreas: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const owner = currentOwner(ctx);
      const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);
      if (!limits.aiEnabled) {
        throw planLimitExceeded('AI critique requires a Pro or Team plan.');
      }

      const apiKey = await ctx.prisma.apiKey.findFirst({
        where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
        orderBy: { createdAt: 'desc' },
      });
      if (!apiKey) {
        throw planLimitExceeded('No AI API key configured. Add one in Settings → AI Keys.');
      }

      await requireProjectAccess(ctx, input.projectId);
      const manuscript = await ctx.prisma.manuscript.findUnique({
        where: { projectId: input.projectId },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            select: { id: true, kind: true, title: true, content: true },
          },
        },
      });

      const chapters = (manuscript?.chapters ?? [])
        .filter((c) => NARRATIVE_KINDS.includes(c.kind as ChapterKind))
        .map((c) => ({
          id: c.id,
          title: c.title,
          text: tiptapText(c.content as unknown as TiptapDoc),
        }));

      if (chapters.length === 0) {
        throw new Error('No narrative content to analyse yet.');
      }

      const manuscriptText = chapters
        .map((c) => `## ${c.title}\n\n${c.text}`)
        .join('\n\n---\n\n')
        .slice(0, 60000); // cap at ~15k tokens

      const decryptedKey = decryptApiKey(apiKey.ciphertext, apiKey.iv, apiKey.authTag);

      // Collect the full stream into a string
      const stream = streamAiText({
        provider: apiKey.provider as AiProvider,
        decryptedKey,
        systemPrompt: `You are an experienced developmental editor and literary critic. Analyze the provided manuscript and give structured editorial feedback. Respond with ONLY valid JSON in this format, no markdown:\n{"summary":"string","score":number (0-100),"findings":[{"category":"string","severity":"info"|"warn"|"high","label":"string","guidance":"string","examples":["string"]}]}\nCategories to analyse: plot_structure, character_development, pacing, voice_consistency, theme, dialogue, show_vs_tell.`,
        userPrompt: [
          `Manuscript:\n\n${manuscriptText}`,
          input.focusAreas ? `Focus areas: ${input.focusAreas}` : null,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });

      let result = '';
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += value;
      }

      // Parse response
      const clean = result.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      try {
        return JSON.parse(clean) as {
          summary: string;
          score: number;
          findings: { category: string; severity: string; label: string; guidance: string; examples: string[] }[];
        };
      } catch {
        return { summary: result, score: 0, findings: [] };
      }
    }),
});
