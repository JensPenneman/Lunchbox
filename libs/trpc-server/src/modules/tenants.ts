import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';

export const tenantsRouter = router({
  listPublic: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, slug: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where: { slug: input.slug },
        include: {
          products: {
            where: { available: true },
            orderBy: { name: 'asc' },
          },
        },
      });
      if (!tenant || tenant.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' });
      }
      return tenant;
    }),
});
