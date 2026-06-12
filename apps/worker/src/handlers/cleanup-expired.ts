import { prisma, SubscriptionStatus } from '@liberscript/db';
import { deleteObject } from '@liberscript/storage';
import { logger } from '../logger';

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hard-deletes projects (and their storage objects) for owners whose plan
 * lapsed more than 7 days ago. Runs daily.
 */
export async function handleCleanupExpired(): Promise<{ ownersProcessed: number; projectsDeleted: number }> {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS);
  const lapsed = await prisma.subscription.findMany({
    where: {
      currentPeriodEnd: { lte: cutoff },
      status: { notIn: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    },
    select: { ownerType: true, ownerId: true },
  });

  let projectsDeleted = 0;
  for (const { ownerType, ownerId } of lapsed) {
    const projects = await prisma.project.findMany({ where: { ownerType, ownerId }, select: { id: true } });
    for (const { id } of projects) {
      const [assets, artifacts] = await Promise.all([
        prisma.asset.findMany({ where: { projectId: id }, select: { storageKey: true } }),
        prisma.exportArtifact.findMany({ where: { exportJob: { projectId: id } }, select: { storageKey: true } }),
      ]);
      for (const obj of [...assets, ...artifacts]) {
        await deleteObject(obj.storageKey).catch((err) =>
          logger.warn({ err, key: obj.storageKey }, 'cleanup: storage delete failed'),
        );
      }
      // Cascades Manuscript/Chapter/ExportJob/ExportArtifact/Asset.
      await prisma.project.delete({ where: { id } });
      projectsDeleted++;
    }
  }

  logger.info({ ownersProcessed: lapsed.length, projectsDeleted }, 'cleanup-expired complete');
  return { ownersProcessed: lapsed.length, projectsDeleted };
}
