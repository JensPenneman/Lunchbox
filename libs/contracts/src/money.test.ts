import { describe, it, expect } from 'vitest';
import { computeVatSplit, formatEur } from './money';

describe('computeVatSplit', () => {
  it('splits a 12% VAT takeaway total correctly', () => {
    // 5.00 EUR gross at 12% -> ~4.464 net + ~0.536 VAT
    const { netCents, vatCents } = computeVatSplit(500, 1200);
    expect(netCents).toBe(446);
    expect(vatCents).toBe(54);
    expect(netCents + vatCents).toBe(500);
  });

  it('splits a 21% VAT beverage total correctly', () => {
    const { netCents, vatCents } = computeVatSplit(200, 2100);
    expect(netCents + vatCents).toBe(200);
    expect(vatCents).toBeGreaterThan(0);
  });

  it('handles 6% VAT', () => {
    const { netCents, vatCents } = computeVatSplit(180, 600);
    expect(netCents + vatCents).toBe(180);
  });

  it('never produces negative cents', () => {
    const { netCents, vatCents } = computeVatSplit(1, 1200);
    expect(netCents).toBeGreaterThanOrEqual(0);
    expect(vatCents).toBeGreaterThanOrEqual(0);
  });
});

describe('formatEur', () => {
  it('formats in Belgian-Dutch locale with euro sign', () => {
    const formatted = formatEur(1234, 'nl-BE');
    expect(formatted).toMatch(/12,34/);
    expect(formatted).toContain('€');
  });
});
