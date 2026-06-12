import {
  ACTIVE_PLAN_LIMITS,
  NO_ACCESS_LIMITS,
  hasActivePlanAccess,
  isAdminEmail,
  type PlanLimits,
} from '@liberscript/core';
import type { OwnerType, PrismaClient } from '@liberscript/db';

/**
 * Resolve the effective plan limits for an owner (user or team). There is no
 * free tier: an owner gets full access only while their `Subscription` is
 * ACTIVE/TRIALING and not past `currentPeriodEnd` — otherwise access collapses
 * to `NO_ACCESS_LIMITS` immediately (the 7-day grace period only delays when
 * the cleanup job deletes their data, not when access is revoked).
 *
 * Admin accounts (`ADMIN_EMAILS`) bypass this entirely and always get full
 * access — pass the caller's email so this can apply.
 */
export async function resolvePlanLimits(
  prisma: PrismaClient,
  ownerType: OwnerType,
  ownerId: string,
  userEmail?: string | null,
): Promise<PlanLimits> {
  if (isAdminEmail(userEmail)) {
    return { ...ACTIVE_PLAN_LIMITS };
  }
  const sub = await prisma.subscription.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
  });
  return hasActivePlanAccess(sub) ? { ...ACTIVE_PLAN_LIMITS } : { ...NO_ACCESS_LIMITS };
}
