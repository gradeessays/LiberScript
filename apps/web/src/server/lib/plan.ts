import { PLAN_LIMITS, PlanTier, type PlanLimits } from '@liberscript/core';
import type { OwnerType, PrismaClient } from '@liberscript/db';

/**
 * Resolve the effective plan limits for an owner (user or team). Until billing
 * (Phase 8) writes Subscription rows, everyone is on the FREE tier.
 */
export async function resolvePlanLimits(
  prisma: PrismaClient,
  ownerType: OwnerType,
  ownerId: string,
): Promise<PlanLimits> {
  const sub = await prisma.subscription.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
  });
  const tier = (sub?.tier as PlanTier | undefined) ?? PlanTier.FREE;
  return PLAN_LIMITS[tier];
}
