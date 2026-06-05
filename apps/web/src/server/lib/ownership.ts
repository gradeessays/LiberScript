import { TRPCError } from '@trpc/server';
import { OwnerType, MemberRole, ROLE_RANK } from '@liberscript/core';
import { asRole } from '@liberscript/auth/rbac';
import type { PrismaClient, Project } from '@liberscript/db';

interface OwnerCtx {
  prisma: PrismaClient;
  user: { id: string };
  activeOrganizationId: string | null;
}

export interface Owner {
  ownerType: OwnerType;
  ownerId: string;
}

/** The workspace the caller is currently acting in: their team, or personal. */
export function currentOwner(ctx: OwnerCtx): Owner {
  return ctx.activeOrganizationId
    ? { ownerType: OwnerType.ORGANIZATION, ownerId: ctx.activeOrganizationId }
    : { ownerType: OwnerType.USER, ownerId: ctx.user.id };
}

/**
 * Load a project and verify the caller may access it. For team-owned projects,
 * the caller must be a member with at least `minRole` (default VIEWER).
 */
export async function requireProjectAccess(
  ctx: OwnerCtx,
  projectId: string,
  minRole: MemberRole = MemberRole.VIEWER,
): Promise<Project> {
  const project = await ctx.prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
  }

  if (project.ownerType === OwnerType.USER) {
    if (project.ownerId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this project.' });
    }
    return project;
  }

  // Team-owned: require membership with sufficient role.
  const membership = await ctx.prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: project.ownerId, userId: ctx.user.id } },
  });
  const role = asRole(membership?.role);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new TRPCError({ code: 'FORBIDDEN', message: `Requires at least the ${minRole} role.` });
  }
  return project;
}

/** Load a chapter after verifying access to its project (default VIEWER). */
export async function requireChapterAccess(
  ctx: OwnerCtx,
  chapterId: string,
  minRole: MemberRole = MemberRole.VIEWER,
) {
  const chapter = await ctx.prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { manuscript: { select: { id: true, projectId: true } } },
  });
  if (!chapter) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found.' });
  }
  await requireProjectAccess(ctx, chapter.manuscript.projectId, minRole);
  return chapter;
}

/** Verify the caller can create content in the current workspace (team: editor+). */
export async function requireCreateAccess(ctx: OwnerCtx): Promise<Owner> {
  const owner = currentOwner(ctx);
  if (owner.ownerType === OwnerType.ORGANIZATION) {
    const membership = await ctx.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId: owner.ownerId, userId: ctx.user.id } },
    });
    const role = asRole(membership?.role);
    if (!role || ROLE_RANK[role] < ROLE_RANK[MemberRole.EDITOR]) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Requires at least the editor role.' });
    }
  }
  return owner;
}
