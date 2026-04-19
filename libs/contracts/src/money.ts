import { z } from 'zod';

export const centsSchema = z.number().int().nonnegative();
export type Cents = z.infer<typeof centsSchema>;

export const vatRateBasisPoints = z.number().int().min(0).max(10000);

export function formatEur(cents: number, locale = 'nl-BE'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function computeVatSplit(grossCents: number, vatRateBp: number): {
  netCents: number;
  vatCents: number;
} {
  // gross = net * (1 + rate). net = gross / (1 + rate).
  const rate = vatRateBp / 10000;
  const netCents = Math.round(grossCents / (1 + rate));
  const vatCents = grossCents - netCents;
  return { netCents, vatCents };
}
