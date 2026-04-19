import { z } from 'zod';
import { centsSchema, vatRateBasisPoints } from './money';

export const productSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().nullable(),
  priceCents: centsSchema,
  vatRate: vatRateBasisPoints,
  isTakeawayPrepared: z.boolean(),
  available: z.boolean(),
  imageUrl: z.string().url().nullable(),
});
export type Product = z.infer<typeof productSchema>;

export const createProductInput = productSchema
  .pick({
    name: true,
    description: true,
    priceCents: true,
    vatRate: true,
    isTakeawayPrepared: true,
    available: true,
    imageUrl: true,
  })
  .partial({ description: true, vatRate: true, isTakeawayPrepared: true, available: true, imageUrl: true });
export type CreateProductInput = z.infer<typeof createProductInput>;

export const updateProductInput = z.object({
  id: z.string().uuid(),
  patch: createProductInput.partial(),
});
export type UpdateProductInput = z.infer<typeof updateProductInput>;
