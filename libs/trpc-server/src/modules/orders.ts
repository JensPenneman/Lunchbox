import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { placeOrderInput, computeVatSplit } from '@lunchbox/contracts';
import {
  sendMail,
  orderConfirmationEmail,
  merchantNewOrderEmail,
  type OrderEmailData,
} from '@lunchbox/notifications';

export const ordersRouter = router({
  place: protectedProcedure.input(placeOrderInput).mutation(async ({ ctx, input }) => {
    const products = await ctx.db.product.findMany({
      where: {
        id: { in: input.lines.map((l) => l.productId) },
        tenantId: input.tenantId,
        available: true,
      },
    });
    if (products.length !== new Set(input.lines.map((l) => l.productId)).size) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'One or more products are unavailable',
      });
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotalCents = 0;
    let vatTotalCents = 0;
    const itemsData = input.lines.map((line) => {
      const product = productMap.get(line.productId)!;
      const lineTotalCents = product.priceCents * line.quantity;
      const { vatCents } = computeVatSplit(lineTotalCents, product.vatRate);
      subtotalCents += lineTotalCents - vatCents;
      vatTotalCents += vatCents;
      return {
        productId: product.id,
        nameSnapshot: product.name,
        unitPriceCents: product.priceCents,
        vatRate: product.vatRate,
        quantity: line.quantity,
        lineTotalCents,
      };
    });
    const totalCents = subtotalCents + vatTotalCents;

    const order = await ctx.db.order.create({
      data: {
        tenantId: input.tenantId,
        customerId: ctx.user.id,
        fulfillmentType: input.fulfillmentType,
        notes: input.notes,
        subtotalCents,
        vatTotalCents,
        totalCents,
        items: { create: itemsData },
      },
      include: { items: true, tenant: { select: { name: true, slug: true } } },
    });

    return order;
  }),

  markPaid: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          tenant: { select: { id: true, name: true } },
          customer: { select: { name: true, email: true } },
          items: true,
        },
      });
      if (!order || order.customerId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      if (order.status !== 'PENDING_PAYMENT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot mark as paid from status ${order.status}`,
        });
      }
      const updated = await ctx.db.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      // Fire-and-forget email notifications — do not block the customer on SMTP.
      const emailData: OrderEmailData = {
        orderId: order.id,
        tenantName: order.tenant.name,
        customerName: order.customer.name ?? order.customer.email,
        items: order.items.map((it) => ({
          name: it.nameSnapshot,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          lineTotalCents: it.lineTotalCents,
        })),
        totalCents: order.totalCents,
        vatCents: order.vatTotalCents,
        notes: order.notes,
      };
      void sendMail(
        orderConfirmationEmail({ ...emailData, customerEmail: order.customer.email }),
      );
      const ownerMembership = await ctx.db.merchantUser.findFirst({
        where: { tenantId: order.tenantId, role: 'OWNER' },
        include: { user: { select: { email: true } } },
      });
      if (ownerMembership?.user.email) {
        void sendMail(
          merchantNewOrderEmail({
            ...emailData,
            merchantEmail: ownerMembership.user.email,
            customerEmail: order.customer.email,
          }),
        );
      }

      return updated;
    }),

  myList: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.order.findMany({
      where: { customerId: ctx.user.id },
      include: {
        tenant: { select: { name: true, slug: true } },
        items: true,
      },
      orderBy: { placedAt: 'desc' },
      take: 50,
    });
  }),

  getMine: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          tenant: { select: { name: true, slug: true } },
          items: true,
        },
      });
      if (!order || order.customerId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return order;
    }),
});
