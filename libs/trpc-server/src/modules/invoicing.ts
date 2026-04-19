import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { renderUblInvoice } from '../peppol/ubl';

/**
 * Peppol UBL BIS 3.0 invoice generation.
 * Note: this is a PoC renderer — for production, use an access-point provider
 * (Storecove / Ibanity / Chift) which handles validation, signing, and network delivery.
 */
export const invoicingRouter = router({
  orderInvoiceXml: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          tenant: true,
          customer: { select: { id: true, email: true, name: true } },
          items: true,
        },
      });
      if (!order) throw new TRPCError({ code: 'NOT_FOUND' });

      // Authorization: customer on their own order, or merchant of the tenant.
      const isCustomer = order.customerId === ctx.user.id;
      let isMerchant = false;
      if (!isCustomer) {
        const membership = await ctx.db.merchantUser.findUnique({
          where: { userId_tenantId: { userId: ctx.user.id, tenantId: order.tenantId } },
        });
        isMerchant = !!membership;
      }
      const userRecord = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { platformRole: true },
      });
      const isAccountant =
        userRecord?.platformRole === 'ACCOUNTANT' || userRecord?.platformRole === 'ADMIN';

      if (!isCustomer && !isMerchant && !isAccountant) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const xml = renderUblInvoice({
        invoiceNumber: `LBX-${order.id.slice(0, 8).toUpperCase()}`,
        issueDate: order.paidAt ?? order.placedAt,
        supplier: {
          name: order.tenant.legalName ?? order.tenant.name,
          vatNumber: order.tenant.vatNumber ?? 'BE0000000000',
        },
        customer: {
          name: order.customer.name ?? order.customer.email,
          email: order.customer.email,
        },
        items: order.items.map((it) => ({
          description: it.nameSnapshot,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          vatRateBp: it.vatRate,
          lineTotalCents: it.lineTotalCents,
        })),
        subtotalCents: order.subtotalCents,
        vatTotalCents: order.vatTotalCents,
        totalCents: order.totalCents,
      });

      return {
        xml,
        filename: `lunchbox-invoice-${order.id.slice(0, 8)}.xml`,
        contentType: 'application/xml',
      };
    }),
});
