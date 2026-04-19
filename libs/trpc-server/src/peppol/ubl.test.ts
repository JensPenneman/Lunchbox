import { describe, it, expect } from 'vitest';
import { renderUblInvoice } from './ubl';

describe('renderUblInvoice', () => {
  it('produces valid-looking UBL XML', () => {
    const xml = renderUblInvoice({
      invoiceNumber: 'LBX-12345678',
      issueDate: new Date('2026-04-16T12:00:00Z'),
      supplier: { name: "Jan's Broodjes BV", vatNumber: 'BE0123456789' },
      customer: { name: 'Charlie Customer', email: 'charlie@test.be' },
      items: [
        { description: 'Broodje Kaas', quantity: 2, unitPriceCents: 450, vatRateBp: 1200, lineTotalCents: 900 },
        { description: 'Cola Zero', quantity: 1, unitPriceCents: 200, vatRateBp: 2100, lineTotalCents: 200 },
      ],
      subtotalCents: 968,
      vatTotalCents: 132,
      totalCents: 1100,
    });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('urn:fdc:peppol.eu:2017:poacc:billing:3.0');
    expect(xml).toContain('LBX-12345678');
    expect(xml).toContain('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>');
    expect(xml).toContain('BE0123456789');
    expect(xml).toContain('Broodje Kaas');
    expect(xml).toContain('2026-04-16');
    // Aggregated tax subtotals — one for each unique rate
    expect(xml.match(/<cac:TaxSubtotal>/g)?.length).toBe(2);
    // 12% and 21% percent lines appear
    expect(xml).toContain('<cbc:Percent>12.00</cbc:Percent>');
    expect(xml).toContain('<cbc:Percent>21.00</cbc:Percent>');
  });

  it('escapes XML special chars', () => {
    const xml = renderUblInvoice({
      invoiceNumber: 'LBX-ESC',
      issueDate: new Date('2026-04-16'),
      supplier: { name: 'Shop & Co', vatNumber: 'BE0111111111' },
      customer: { name: 'O\'Brien <Test>', email: 'x@y.be' },
      items: [],
      subtotalCents: 0,
      vatTotalCents: 0,
      totalCents: 0,
    });
    expect(xml).toContain('Shop &amp; Co');
    expect(xml).toContain('O&apos;Brien &lt;Test&gt;');
  });
});
