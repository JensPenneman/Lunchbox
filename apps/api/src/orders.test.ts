import { describe, it, expect } from 'vitest';
import { computeVatSplit } from '@lunchbox/contracts';

describe('order math', () => {
  it('produces consistent subtotal+VAT=total on a realistic basket', () => {
    const lines = [
      { priceCents: 450, qty: 2, vat: 1200 }, // Broodje Kaas
      { priceCents: 480, qty: 1, vat: 1200 }, // Broodje Hesp
      { priceCents: 200, qty: 1, vat: 2100 }, // Cola Zero
    ];
    let subtotal = 0;
    let vat = 0;
    let total = 0;
    for (const l of lines) {
      const line = l.priceCents * l.qty;
      const split = computeVatSplit(line, l.vat);
      subtotal += split.netCents;
      vat += split.vatCents;
      total += line;
    }
    expect(subtotal + vat).toBe(total);
  });
});
