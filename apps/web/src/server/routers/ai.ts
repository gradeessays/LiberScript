import { z } from 'zod';
import { AiProvider, AppError, ErrorCode, planLimitExceeded } from '@liberscript/core';
import { protectedProcedure, router } from '../trpc';
import { currentOwner } from '../lib/ownership';
import { encryptApiKey } from '../lib/crypto';
import { resolvePlanLimits } from '../lib/plan';

export const aiRouter = router({
  /** List configured keys for the current owner (provider + last4 only — no ciphertext). */
  listKeys: protectedProcedure.query(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    return ctx.prisma.apiKey.findMany({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, provider: true, label: true, last4: true, createdAt: true },
    });
  }),

  /** Add or replace the key for a given provider. One key per provider per owner. */
  setKey: protectedProcedure
    .input(
      z.object({
        provider: z.nativeEnum(AiProvider),
        label: z.string().max(64).optional(),
        key: z.string().min(8).max(512),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = currentOwner(ctx);
      const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);
      if (!limits.aiEnabled) {
        throw planLimitExceeded('AI features require a Pro or Team plan.');
      }
      const { ciphertext, iv, authTag } = encryptApiKey(input.key);
      const last4 = input.key.slice(-4);
      const existing = await ctx.prisma.apiKey.findFirst({
        where: { ownerType: owner.ownerType, ownerId: owner.ownerId, provider: input.provider },
      });
      if (existing) {
        await ctx.prisma.apiKey.update({
          where: { id: existing.id },
          data: { ciphertext, iv, authTag, last4, label: input.label ?? null, createdById: ctx.user.id },
        });
      } else {
        await ctx.prisma.apiKey.create({
          data: {
            ownerType: owner.ownerType,
            ownerId: owner.ownerId,
            createdById: ctx.user.id,
            provider: input.provider,
            label: input.label ?? null,
            ciphertext,
            iv,
            authTag,
            last4,
          },
        });
      }
      return { ok: true };
    }),

  /** Remove an API key. Only the owning user/team can delete it. */
  deleteKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owner = currentOwner(ctx);
      const key = await ctx.prisma.apiKey.findUnique({ where: { id: input.id } });
      if (!key || key.ownerType !== owner.ownerType || key.ownerId !== owner.ownerId) {
        throw new AppError(ErrorCode.NOT_FOUND, 'API key not found.');
      }
      await ctx.prisma.apiKey.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /**
   * Check whether the current owner has any AI key configured and is on a plan
   * that allows AI. Used by the editor to decide whether to show the Generate panel.
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);
    if (!limits.aiEnabled) return { enabled: false as const, hasKey: false, keys: [] as { provider: string }[] };
    const keys = await ctx.prisma.apiKey.findMany({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      orderBy: { createdAt: 'desc' },
      select: { provider: true },
    });
    return { enabled: true as const, hasKey: keys.length > 0, keys };
  }),
});
