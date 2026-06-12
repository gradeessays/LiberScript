import { PLAN_LIMITS, PlanTier, isAdminEmail, type PlanLimits } from '@liberscript/core';
import type { OwnerType, PrismaClient } from '@liberscript/db';

/**
 * Resolve the effective plan limits for an owner (user or team), reading the
 * `Subscription` row written by Paystack billing/webhooks (or an admin
 * manual override via `admin.setTier`). Defaults to FREE when no subscription
 * exists.
 *
 * Admin accounts (`ADMIN_EMAILS`) bypass this entirely and get TEAM-tier
 * limits regardless of subscription state — pass the caller's email so this
 * can apply.
 */
export async function resolvePlanLimits(
  prisma: PrismaClient,
  ownerType: OwnerType,
  ownerId: string,
  userEmail?: string | null,
): Promise<PlanLimits> {
  if (isAdminEmail(userEmail)) {
    return { ...PLAN_LIMITS.TEAM };
  }
  const sub = await prisma.subscription.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
  });
  const tier = (sub?.tier as PlanTier | undefined) ?? PlanTier.FREE;
  return PLAN_LIMITS[tier];
}
