import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  getServerEnv,
  isAdminEmail,
  MemberRole,
  OwnerType,
  PAYMENT_PROVIDERS,
  PaymentProvider,
  PlanTier,
  ROLE_RANK,
} from '@liberscript/core';
import { SubscriptionStatus, type PrismaClient } from '@liberscript/db';
import { asRole } from '@liberscript/auth/rbac';
import { protectedProcedure, router } from '../trpc';
import { currentOwner, type Owner } from '../lib/ownership';
import { resolvePlanLimits } from '../lib/plan';
import { getPaymentProviderConfig, listActivePaymentProviders, planKeyFor, PAYMENT_CLIENTS } from '../lib/payments';

interface BillingCtx {
  prisma: PrismaClient;
  user: { id: string };
}

/** Team-owned subscriptions can only be managed by admins/owners of the team. */
async function requireBillingAccess(ctx: BillingCtx, owner: Owner): Promise<void> {
  if (owner.ownerType !== OwnerType.ORGANIZATION) return;
  const membership = await ctx.prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: owner.ownerId, userId: ctx.user.id } },
  });
  const role = asRole(membership?.role);
  if (!role || ROLE_RANK[role] < ROLE_RANK[MemberRole.ADMIN]) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Requires at least the admin role to manage billing.' });
  }
}

export const billingRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { ownerType_ownerId: { ownerType: owner.ownerType, ownerId: owner.ownerId } },
    });
    const isAdmin = isAdminEmail(ctx.user.email);
    const limits = await resolvePlanLimits(ctx.prisma, owner.ownerType, owner.ownerId, ctx.user.email);
    const tier = isAdmin ? PlanTier.TEAM : (subscription?.tier as PlanTier | undefined) ?? PlanTier.FREE;
    return { subscription, tier, limits, isAdmin };
  }),

  /** Active (enabled + fully configured) payment providers, for the billing page's buttons. */
  listProviders: protectedProcedure.query(async () => {
    const providers = await listActivePaymentProviders();
    return providers.map((provider) => ({ provider, label: PAYMENT_PROVIDERS[provider].label }));
  }),

  /** Starts a checkout with the given provider for Pro/Team and returns the redirect URL. */
  checkout: protectedProcedure
    .input(
      z.object({
        provider: z.nativeEnum(PaymentProvider),
        tier: z.enum([PlanTier.PRO, PlanTier.TEAM]),
        interval: z.enum(['monthly', 'annual']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = currentOwner(ctx);
      await requireBillingAccess(ctx, owner);

      const cfg = await getPaymentProviderConfig(input.provider);
      if (!cfg?.enabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `${PAYMENT_PROVIDERS[input.provider].label} is not enabled.`,
        });
      }
      const plans = (cfg.config.plans as Record<string, string> | undefined) ?? {};
      if (!plans[planKeyFor(input.tier, input.interval)]) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `${PAYMENT_PROVIDERS[input.provider].label} is not configured for ${input.tier} (${input.interval}).`,
        });
      }

      const appUrl = getServerEnv().APP_URL;
      const result = await PAYMENT_CLIENTS[input.provider].checkout(cfg, {
        email: ctx.user.email,
        tier: input.tier,
        interval: input.interval,
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        successUrl: `${appUrl}/settings/billing?status=success`,
        cancelUrl: `${appUrl}/settings/billing?status=cancelled`,
      });
      return { url: result.url };
    }),

  /** Returns a hosted link the customer can use to update their card / manage their plan. */
  manageSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    await requireBillingAccess(ctx, owner);

    const subscription = await ctx.prisma.subscription.findUnique({
      where: { ownerType_ownerId: { ownerType: owner.ownerType, ownerId: owner.ownerId } },
    });
    if (!subscription?.provider || !subscription.providerSubscriptionId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription to manage.' });
    }
    const cfg = await getPaymentProviderConfig(subscription.provider);
    if (!cfg) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Payment provider is not configured.' });
    }
    const result = await PAYMENT_CLIENTS[subscription.provider].manageSubscription(cfg, subscription);
    if (!result) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Manage your subscription from your PayPal account.',
      });
    }
    return { url: result.url };
  }),

  /** Cancels the active subscription. The plan is downgraded to Free immediately. */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const owner = currentOwner(ctx);
    await requireBillingAccess(ctx, owner);

    const subscription = await ctx.prisma.subscription.findUnique({
      where: { ownerType_ownerId: { ownerType: owner.ownerType, ownerId: owner.ownerId } },
    });
    if (!subscription?.provider || !subscription.providerSubscriptionId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription to cancel.' });
    }
    const cfg = await getPaymentProviderConfig(subscription.provider);
    if (!cfg) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Payment provider is not configured.' });
    }
    await PAYMENT_CLIENTS[subscription.provider].cancelSubscription(cfg, subscription);
    await ctx.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELED, tier: PlanTier.FREE },
    });
    return { ok: true };
  }),
});
