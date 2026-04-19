import { z } from 'zod';

export const tenantStatusSchema = z.enum(['ONBOARDING', 'ACTIVE', 'SUSPENDED']);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const merchantRoleSchema = z.enum(['OWNER', 'MANAGER', 'STAFF']);
export type MerchantRole = z.infer<typeof merchantRoleSchema>;

export const tenantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().nullable(),
  legalName: z.string().nullable(),
  vatNumber: z
    .string()
    .regex(/^BE\d{10}$/, 'VAT number must be in Belgian format BE0123456789')
    .nullable(),
  status: tenantStatusSchema,
});
export type Tenant = z.infer<typeof tenantSchema>;

export const publicTenantSchema = tenantSchema.pick({
  id: true,
  slug: true,
  name: true,
  description: true,
});
export type PublicTenant = z.infer<typeof publicTenantSchema>;
