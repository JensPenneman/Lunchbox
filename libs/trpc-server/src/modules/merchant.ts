import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { OrderStatus } from '@lunchbox/db';
import { router, merchantProcedure } from '../trpc';
import {
  createProductInput,
  updateProductInput,
  merchantOrderTransitionInput,
} from '@lunchbox/contracts';

// tenantId is provided by merchantProcedure's base input — children just add fields.
export const merchantRouter = router({
  productsList: merchantProcedure.query(async ({ ctx, input }) => {
    return ctx.db.product.findMany({
      where: { tenantId: input.tenantId },
      orderBy: { name: 'asc' },
    });
  }),

  productCreate: merchantProcedure
    .input(z.object({ data: createProductInput }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.product.create({
        data: {
          tenantId: input.tenantId,
          name: input.data.name,
          description: input.data.description ?? null,
          priceCents: input.data.priceCents,
          vatRate: input.data.vatRate ?? 1200,
          isTakeawayPrepared: input.data.isTakeawayPrepared ?? true,
          available: input.data.available ?? true,
          imageUrl: input.data.imageUrl ?? null,
        },
      });
    }),

  productUpdate: merchantProcedure.input(updateProductInput).mutation(async ({ ctx, input }) => {
    const product = await ctx.db.product.findUnique({ where: { id: input.id } });
    if (!product || product.tenantId !== input.tenantId) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    return ctx.db.product.update({
      where: { id: input.id },
      data: input.patch,
    });
  }),

  productDelete: merchantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({ where: { id: input.id } });
      if (!product || product.tenantId !== input.tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return ctx.db.product.delete({ where: { id: input.id } });
    }),

  ordersList: merchantProcedure.query(async ({ ctx, input }) => {
    return ctx.db.order.findMany({
      where: {
        tenantId: input.tenantId,
        status: { not: 'PENDING_PAYMENT' },
      },
      include: {
        customer: { select: { name: true, email: true } },
        items: true,
      },
      orderBy: { placedAt: 'desc' },
      take: 200,
    });
  }),

  stats: merchantProcedure.query(async ({ ctx, input }) => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [todayOrders, openOrders, totalAgg] = await Promise.all([
      ctx.db.order.count({
        where: { tenantId: input.tenantId, placedAt: { gte: since }, status: { not: 'CANCELLED' } },
      }),
      ctx.db.order.count({
        where: {
          tenantId: input.tenantId,
          status: { in: ['PAID', 'ACCEPTED', 'PREPARING', 'READY'] },
        },
      }),
      ctx.db.order.aggregate({
        where: {
          tenantId: input.tenantId,
          status: { in: ['PAID', 'ACCEPTED', 'PREPARING', 'READY', 'FULFILLED'] },
          placedAt: { gte: since },
        },
        _sum: { totalCents: true, vatTotalCents: true },
      }),
    ]);
    return {
      todayOrders,
      openOrders,
      todayRevenueCents: totalAgg._sum.totalCents ?? 0,
      todayVatCents: totalAgg._sum.vatTotalCents ?? 0,
    };
  }),

  ordersTransition: merchantProcedure
    .input(merchantOrderTransitionInput)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({ where: { id: input.orderId } });
      if (!order || order.tenantId !== input.tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      const allowed = transitionsFrom(order.status);
      if (!allowed.includes(input.to)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot transition from ${order.status} to ${input.to}`,
        });
      }
      const timestampField = timestampForStatus(input.to);
      return ctx.db.order.update({
        where: { id: order.id },
        data: {
          status: input.to,
          ...(timestampField ? { [timestampField]: new Date() } : {}),
        },
      });
    }),
});

function transitionsFrom(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case 'PAID':
      return ['ACCEPTED', 'CANCELLED'];
    case 'ACCEPTED':
      return ['PREPARING', 'CANCELLED'];
    case 'PREPARING':
      return ['READY', 'CANCELLED'];
    case 'READY':
      return ['FULFILLED', 'CANCELLED'];
    default:
      return [];
  }
}

function timestampForStatus(status: OrderStatus): string | null {
  switch (status) {
    case 'ACCEPTED':
      return 'acceptedAt';
    case 'READY':
      return 'readyAt';
    case 'FULFILLED':
      return 'fulfilledAt';
    case 'CANCELLED':
      return 'cancelledAt';
    default:
      return null;
  }
}
