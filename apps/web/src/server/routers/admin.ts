import { z } from 'zod';
import { OwnerType, PAYMENT_PROVIDERS, PaymentProvider, PlanTier } from '@liberscript/core';
import { type Prisma, SubscriptionStatus } from '@liberscript/db';
import { adminProcedure, router } from '../trpc';
import { decryptJson, encryptJson } from '../lib/crypto';

export const adminRouter = router({
  /** Headline counts for the admin dashboard. */
  stats: adminProcedure.query(async ({ ctx }) => {
    const [users, organizations, projects, subscriptions] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.organization.count(),
      ctx.prisma.project.count({ where: { archivedAt: null } }),
      ctx.prisma.subscription.groupBy({ by: ['tier'], _count: { _all: true } }),
    ]);
    const tierCounts: Record<PlanTier, number> = { FREE: 0, PRO: 0, TEAM: 0 };
    for (const row of subscriptions) tierCounts[row.tier as PlanTier] = row._count._all;
    return { users, organizations, projects, subscriptions: tierCounts };
  }),

  /** Every personal (User) and team (Organization) owner with its subscription, if any. */
  listOwners: adminProcedure.query(async ({ ctx }) => {
    const [users, orgs, subs] = await Promise.all([
      ctx.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      ctx.prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, name: true, slug: true, createdAt: true },
      }),
      ctx.prisma.subscription.findMany(),
    ]);
    const subByKey = new Map(subs.map((s) => [`${s.ownerType}:${s.ownerId}`, s]));

    const userOwners = users.map((u) => ({
      ownerType: OwnerType.USER as OwnerType,
      ownerId: u.id,
      name: u.name,
      email: u.email as string | null,
      createdAt: u.createdAt,
      subscription: subByKey.get(`USER:${u.id}`) ?? null,
    }));
    const orgOwners = orgs.map((o) => ({
      ownerType: OwnerType.ORGANIZATION as OwnerType,
      ownerId: o.id,
      name: `${o.name} (${o.slug})`,
      email: null as string | null,
      createdAt: o.createdAt,
      subscription: subByKey.get(`ORGANIZATION:${o.id}`) ?? null,
    }));

    return [...userOwners, ...orgOwners].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }),

  /** Manually grant/change an owner's plan tier — the safety net alongside Paystack. */
  setTier: adminProcedure
    .input(
      z.object({
        ownerType: z.nativeEnum(OwnerType),
        ownerId: z.string(),
        tier: z.nativeEnum(PlanTier),
        status: z.nativeEnum(SubscriptionStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.subscription.upsert({
        where: { ownerType_ownerId: { ownerType: input.ownerType, ownerId: input.ownerId } },
        create: {
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          tier: input.tier,
          status: input.status ?? SubscriptionStatus.ACTIVE,
        },
        update: {
          tier: input.tier,
          ...(input.status ? { status: input.status } : {}),
        },
      });
      return { ok: true };
    }),

  /** Every payment provider's config — secrets reported as set/unset only, never the values. */
  listPaymentProviders: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.paymentProviderConfig.findMany();
    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    return Object.values(PaymentProvider).map((provider) => {
      const row = byProvider.get(provider);
      const def = PAYMENT_PROVIDERS[provider];
      let secrets: Record<string, string> = {};
      if (row?.ciphertext && row.iv && row.authTag) {
        secrets = decryptJson<Record<string, string>>(row.ciphertext, row.iv, row.authTag);
      }
      const secretFieldsSet: Record<string, boolean> = {};
      for (const field of def.secretFields) secretFieldsSet[field.key] = Boolean(secrets[field.key]);
      return {
        provider,
        label: def.label,
        enabled: row?.enabled ?? false,
        secretFieldsSet,
        config: (row?.config as Record<string, unknown> | null) ?? {},
      };
    });
  }),

  /** Updates one payment provider's config. Empty secret fields leave the existing value unchanged. */
  savePaymentProvider: adminProcedure
    .input(
      z.object({
        provider: z.nativeEnum(PaymentProvider),
        enabled: z.boolean(),
        secrets: z.record(z.string()),
        config: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.paymentProviderConfig.findUnique({ where: { provider: input.provider } });
      let mergedSecrets: Record<string, string> = {};
      if (existing?.ciphertext && existing.iv && existing.authTag) {
        mergedSecrets = decryptJson<Record<string, string>>(existing.ciphertext, existing.iv, existing.authTag);
      }
      for (const [key, value] of Object.entries(input.secrets)) {
        if (value) mergedSecrets[key] = value;
      }
      const { ciphertext, iv, authTag } = encryptJson(mergedSecrets);

      await ctx.prisma.paymentProviderConfig.upsert({
        where: { provider: input.provider },
        create: {
          provider: input.provider,
          enabled: input.enabled,
          ciphertext,
          iv,
          authTag,
          config: input.config as Prisma.InputJsonValue,
        },
        update: {
          enabled: input.enabled,
          ciphertext,
          iv,
          authTag,
          config: input.config as Prisma.InputJsonValue,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'payment_provider.update',
          target: input.provider,
          metadata: { enabled: input.enabled },
        },
      });

      return { ok: true };
    }),
});
