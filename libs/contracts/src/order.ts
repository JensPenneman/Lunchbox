import { z } from 'zod';
import { centsSchema, vatRateBasisPoints } from './money';

export const orderStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'FULFILLED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const fulfillmentTypeSchema = z.enum(['PICKUP', 'DELIVERY']);
export type FulfillmentType = z.infer<typeof fulfillmentTypeSchema>;

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  nameSnapshot: z.string(),
  unitPriceCents: centsSchema,
  vatRate: vatRateBasisPoints,
  quantity: z.number().int().positive(),
  lineTotalCents: centsSchema,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string(),
  status: orderStatusSchema,
  fulfillmentType: fulfillmentTypeSchema,
  subtotalCents: centsSchema,
  vatTotalCents: centsSchema,
  totalCents: centsSchema,
  notes: z.string().nullable(),
  placedAt: z.date(),
  items: z.array(orderItemSchema),
});
export type Order = z.infer<typeof orderSchema>;

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const placeOrderInput = z.object({
  tenantId: z.string().uuid(),
  fulfillmentType: fulfillmentTypeSchema.default('PICKUP'),
  notes: z.string().max(500).nullable().default(null),
  lines: z.array(cartLineSchema).min(1).max(50),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInput>;

export const merchantOrderTransitionInput = z.object({
  orderId: z.string().uuid(),
  to: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'FULFILLED', 'CANCELLED']),
});
export type MerchantOrderTransitionInput = z.infer<typeof merchantOrderTransitionInput>;
