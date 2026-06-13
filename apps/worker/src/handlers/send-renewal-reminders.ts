import { prisma, SubscriptionStatus } from '@liberscript/db';
import { getServerEnv, MemberRole, OwnerType, PLAN_PRICING } from '@liberscript/core';
import { sendPlanExpiringEmail, sendPlanExpiredEmail } from '@liberscript/auth/emails';
import { logger } from '../logger';

async function resolveRecipients(ownerType: string, ownerId: string): Promise<string[]> {
  if (ownerType === OwnerType.USER) {
    const user = await prisma.user.findUnique({ where: { id: ownerId }, select: { email: true } });
    return user ? [user.email] : [];
  }
  const members = await prisma.member.findMany({
    where: { organizationId: ownerId, role: { in: [MemberRole.OWNER, MemberRole.ADMIN] } },
    include: { user: { select: { email: true } } },
  });
  return members.map((m) => m.user.email);
}

export async function handleSendRenewalReminders() {
  const now = Date.now();
  const renewUrl = `${getServerEnv().APP_URL}/settings/billing`;

  const subs = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      interval: { not: null },
      currentPeriodEnd: { not: null },
      reminderStage: { lt: 2 },
    },
  });

  let expiringSent = 0;
  let expiredSent = 0;

  for (const sub of subs) {
    const end = sub.currentPeriodEnd!.getTime();
    const pricing = PLAN_PRICING[sub.interval!];
    const recipients = await resolveRecipients(sub.ownerType, sub.ownerId);
    if (recipients.length === 0) continue;

    if (sub.reminderStage < 1) {
      const window = Math.min(24 * 3_600_000, pricing.durationDays * 12 * 3_600_000);
      if (end > now && end - now <= window) {
        for (const to of recipients) {
          await sendPlanExpiringEmail(to, { planLabel: pricing.label, expiresAt: sub.currentPeriodEnd!, renewUrl });
        }
        await prisma.subscription.update({ where: { id: sub.id }, data: { reminderStage: 1 } });
        expiringSent++;
        continue;
      }
    }

    if (end <= now) {
      for (const to of recipients) {
        await sendPlanExpiredEmail(to, { planLabel: pricing.label, renewUrl, graceDays: 7 });
      }
      await prisma.subscription.update({ where: { id: sub.id }, data: { reminderStage: 2 } });
      expiredSent++;
    }
  }

  logger.info({ expiringSent, expiredSent }, 'send-renewal-reminders complete');
  return { expiringSent, expiredSent };
}
