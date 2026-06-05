import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { AppError, ErrorCode, MemberRole } from '@liberscript/core';
import { asRole, hasAtLeast } from '@liberscript/auth/rbac';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const appError = error.cause instanceof AppError ? error.cause : undefined;
    return {
      ...shape,
      data: {
        ...shape.data,
        appCode: appError?.code ?? null,
        appDetail: appError?.detail ?? null,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

type TRPCCode = ConstructorParameters<typeof TRPCError>[0]['code'];

/** Maps a domain ErrorCode to the closest tRPC error code. */
const TRPC_CODE_BY_APP_CODE: Record<ErrorCode, TRPCCode> = {
  [ErrorCode.BAD_REQUEST]: 'BAD_REQUEST',
  [ErrorCode.UNAUTHORIZED]: 'UNAUTHORIZED',
  [ErrorCode.FORBIDDEN]: 'FORBIDDEN',
  [ErrorCode.NOT_FOUND]: 'NOT_FOUND',
  [ErrorCode.CONFLICT]: 'CONFLICT',
  [ErrorCode.RATE_LIMITED]: 'TOO_MANY_REQUESTS',
  [ErrorCode.PLAN_LIMIT_EXCEEDED]: 'FORBIDDEN',
  [ErrorCode.UNPROCESSABLE]: 'UNPROCESSABLE_CONTENT',
  [ErrorCode.INTERNAL]: 'INTERNAL_SERVER_ERROR',
};

/**
 * Middleware that converts thrown AppErrors into TRPCErrors with the mapped
 * code, preserving the original as `cause` (read by the error formatter).
 */
const errorMapper = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    if (err instanceof AppError) {
      throw new TRPCError({
        code: TRPC_CODE_BY_APP_CODE[err.code],
        message: err.message,
        cause: err,
      });
    }
    throw err;
  }
});

export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

/** Open to everyone; still maps AppErrors → TRPCErrors. */
export const publicProcedure = t.procedure.use(errorMapper);

/** Requires an authenticated, verified user. */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
  }
  return next({ ctx: { ...ctx, user: ctx.user, session: ctx.session } });
});

/**
 * Requires an active team context and loads the caller's membership role so
 * downstream procedures can gate by role. Use `.use(requireRole(...))` to
 * enforce a minimum role.
 */
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.activeOrganizationId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active team selected.' });
  }
  const membership = await ctx.prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: ctx.activeOrganizationId,
        userId: ctx.user.id,
      },
    },
  });
  if (!membership) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this team.' });
  }
  const role = asRole(membership.role) ?? MemberRole.VIEWER;
  return next({ ctx: { ...ctx, organizationId: ctx.activeOrganizationId, role } });
});

/**
 * Middleware factory enforcing a minimum team role. Chain onto `orgProcedure`,
 * e.g. `orgProcedure.use(requireRole(MemberRole.ADMIN))`.
 */
export function requireRole(min: MemberRole) {
  return middleware(({ ctx, next }) => {
    const role = (ctx as { role?: MemberRole }).role;
    if (!role || !hasAtLeast(role, min)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires at least the ${min} role.`,
      });
    }
    return next();
  });
}
