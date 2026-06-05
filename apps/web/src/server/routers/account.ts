import { protectedProcedure, router } from '../trpc';

export const accountRouter = router({
  /** The signed-in user, their team memberships, and active team/role. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.member.findMany({
      where: { userId: ctx.user.id },
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const activeRole =
      memberships.find((m) => m.organizationId === ctx.activeOrganizationId)?.role ?? null;

    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        image: ctx.user.image ?? null,
      },
      activeOrganizationId: ctx.activeOrganizationId,
      activeRole,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }),
});
