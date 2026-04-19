import { router, protectedProcedure, publicProcedure } from '../trpc';

export const meRouter = router({
  whoami: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return { authenticated: false as const };
    const fullUser = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, email: true, name: true, platformRole: true },
    });
    return {
      authenticated: true as const,
      user: fullUser,
    };
  }),

  merchantMemberships: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.merchantUser.findMany({
      where: { userId: ctx.user.id },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });
  }),
});
