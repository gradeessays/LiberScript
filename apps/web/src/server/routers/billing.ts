import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  computeRenewedPeriodEnd,
  getServerEnv,
  isAdminEmail,
  MemberRole,
  OwnerType,
  PAYMENT_PROVIDERS,
  PaymentProvider,
  PLAN_PRICING,
  PlanInterval,
  ROLE_RANK,
} from '@liberscript/core';
import { SubscriptionStatus, type PrismaClient } from '@liberscript/db';
import { asRole } from '@liberscript/auth/rbac';
import { protectedProcedure, router } from '../trpc';
import { currentOwner, type Owner } from '../lib/ownership';
import { resolvePlanLimits } from '../lib/plan';
import { capturePaypalOrder, getPaymentProviderConfig, listActivePaymentProviders, PAYMENT_CLIENTS } from '../lib/payments';

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
    return { subscription, limits, isAdmin };
  }),

  /** Active (enabled + fully configured) payment providers, for the billing page's buttons. */
  listProviders: protectedProcedure.query(async () => {
    const providers = await listActivePaymentProviders();
    return providers.map((provider) => ({ provider, label: PAYMENT_PROVIDERS[provider].label }));
  }),

  /** Starts a checkout with the given provider for the chosen plan and returns the redirect URL. */
  checkout: protectedProcedure
    .input(
      z.object({
        provider: z.nativeEnum(PaymentProvider),
        interval: z.nativeEnum(PlanInterval),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = currentOwner(ctx);
      await requireBillingAccess(ctx, owner);

      const cfg = await getPaymentProviderConfig(input.provider);
      if (!cfg?.enabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `${PAYMENT_PROVIDERS[input.provider].label} isn't available right now — try another payment method.`,
        });
      }

      const appUrl = getServerEnv().APP_URL;
      const result = await PAYMENT_CLIENTS[input.provider].checkout(cfg, {
        email: ctx.user.email,
        interval: input.interval,
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        successUrl: `${appUrl}/settings/billing?status=success`,
        cancelUrl: `${appUrl}/settings/billing?status=cancelled`,
      });
      return { url: result.url };
    }),

  /** Captures a PayPal Orders v2 order and activates the plan, stacking on remaining time. */
  capturePaypalOrder: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owner = currentOwner(ctx);
      await requireBillingAccess(ctx, owner);

      const cfg = await getPaymentProviderConfig(PaymentProvider.PAYPAL);
      if (!cfg?.enabled) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'PayPal is not available right now.' });
      }

      const captured = await capturePaypalOrder(cfg, input.orderId);
      if (captured.ownerType !== owner.ownerType || captured.ownerId !== owner.ownerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This order does not belong to you.' });
      }

      const pricing = PLAN_PRICING[captured.interval];
      const existing = await ctx.prisma.subscription.findUnique({
        where: { ownerType_ownerId: { ownerType: owner.ownerType, ownerId: owner.ownerId } },
      });
      const currentPeriodEnd = computeRenewedPeriodEnd(existing?.currentPeriodEnd, pricing.durationDays);

      await ctx.prisma.subscription.upsert({
        where: { ownerType_ownerId: { ownerType: owner.ownerType, ownerId: owner.ownerId } },
        create: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          interval: captured.interval,
          status: SubscriptionStatus.ACTIVE,
          provider: PaymentProvider.PAYPAL,
          providerCustomerId: captured.payerId,
          providerSubscriptionId: null,
          currentPeriodEnd,
          reminderStage: 0,
        },
        update: {
          interval: captured.interval,
          status: SubscriptionStatus.ACTIVE,
          provider: PaymentProvider.PAYPAL,
          providerSubscriptionId: null,
          currentPeriodEnd,
          reminderStage: 0,
          ...(captured.payerId ? { providerCustomerId: captured.payerId } : {}),
        },
      });
      return { ok: true };
    }),
});
