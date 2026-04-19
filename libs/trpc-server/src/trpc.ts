import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        cause: error.cause instanceof Error ? error.cause.message : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user, session: ctx.session } });
});

export const tenantScopedInput = z.object({ tenantId: z.string().uuid() });

export const merchantProcedure = protectedProcedure
  .input(tenantScopedInput)
  .use(async ({ ctx, next, input }) => {
    const membership = await ctx.db.merchantUser.findUnique({
      where: { userId_tenantId: { userId: ctx.user.id, tenantId: input.tenantId } },
    });
    if (!membership) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this tenant' });
    }
    return next({ ctx: { ...ctx, membership } });
  });

export const accountantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const fullUser = await ctx.db.user.findUnique({
    where: { id: ctx.user.id },
    select: { platformRole: true },
  });
  if (!fullUser || (fullUser.platformRole !== 'ACCOUNTANT' && fullUser.platformRole !== 'ADMIN')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Accountant access required' });
  }
  return next();
});
