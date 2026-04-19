import { router, accountantProcedure } from '../trpc';

export const accountingRouter = router({
  ledger: accountantProcedure.query(async ({ ctx }) => {
    const orders = await ctx.db.order.findMany({
      where: { status: { in: ['PAID', 'ACCEPTED', 'PREPARING', 'READY', 'FULFILLED'] } },
      include: {
        tenant: { select: { name: true, slug: true, vatNumber: true } },
        items: true,
      },
      orderBy: { placedAt: 'desc' },
      take: 500,
    });

    const summary = new Map<
      string,
      { tenantName: string; vatNumber: string | null; orderCount: number; subtotalCents: number; vatCents: number; totalCents: number }
    >();

    for (const order of orders) {
      const row = summary.get(order.tenantId) ?? {
        tenantName: order.tenant.name,
        vatNumber: order.tenant.vatNumber,
        orderCount: 0,
        subtotalCents: 0,
        vatCents: 0,
        totalCents: 0,
      };
      row.orderCount += 1;
      row.subtotalCents += order.subtotalCents;
      row.vatCents += order.vatTotalCents;
      row.totalCents += order.totalCents;
      summary.set(order.tenantId, row);
    }

    return {
      orders,
      byTenant: Array.from(summary.entries()).map(([tenantId, row]) => ({ tenantId, ...row })),
    };
  }),
});
