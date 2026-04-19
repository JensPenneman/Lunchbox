/**
 * Minimal Peppol UBL BIS 3.0 invoice renderer.
 *
 * Produces a valid-enough-shape UBL XML document for demo / download purposes.
 * In production this must be validated + delivered via a certified Peppol Access Point.
 *
 * Spec: https://docs.peppol.eu/poacc/billing/3.0/bis/
 */

export interface UblInvoiceLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatRateBp: number;
  lineTotalCents: number;
}

export interface UblInvoiceInput {
  invoiceNumber: string;
  issueDate: Date;
  supplier: { name: string; vatNumber: string };
  customer: { name: string; email: string };
  items: UblInvoiceLine[];
  subtotalCents: number;
  vatTotalCents: number;
  totalCents: number;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

function toBeVatId(v: string): string {
  // Peppol expects party scheme IDs for BE VAT as "BE0123456789"
  return v.startsWith('BE') ? v : `BE${v}`;
}

function vatCategory(rateBp: number): { id: string; percent: string } {
  if (rateBp === 0) return { id: 'Z', percent: '0.00' };
  return { id: 'S', percent: (rateBp / 100).toFixed(2) };
}

export function renderUblInvoice(i: UblInvoiceInput): string {
  const issue = i.issueDate.toISOString().slice(0, 10);
  const lines = i.items
    .map((line, idx) => {
      const cat = vatCategory(line.vatRateBp);
      return `  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${toEuros(line.lineTotalCents)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(line.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${cat.id}</cbc:ID>
        <cbc:Percent>${cat.percent}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${toEuros(line.unitPriceCents)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    })
    .join('\n');

  // Aggregate per-rate subtotals
  const byRate = new Map<number, { taxable: number; vat: number }>();
  for (const l of i.items) {
    const net = l.lineTotalCents - Math.round((l.lineTotalCents * l.vatRateBp) / (10000 + l.vatRateBp));
    const vat = l.lineTotalCents - net;
    const entry = byRate.get(l.vatRateBp) ?? { taxable: 0, vat: 0 };
    entry.taxable += net;
    entry.vat += vat;
    byRate.set(l.vatRateBp, entry);
  }
  const taxSubtotals = Array.from(byRate.entries())
    .map(([rateBp, { taxable, vat }]) => {
      const cat = vatCategory(rateBp);
      return `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${toEuros(taxable)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${toEuros(vat)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${cat.id}</cbc:ID>
        <cbc:Percent>${cat.percent}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(i.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${issue}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(i.supplier.name)}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(toBeVatId(i.supplier.vatNumber))}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(i.supplier.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(i.customer.name)}</cbc:Name></cac:PartyName>
      <cac:Contact><cbc:ElectronicMail>${escapeXml(i.customer.email)}</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${toEuros(i.vatTotalCents)}</cbc:TaxAmount>
${taxSubtotals}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${toEuros(i.subtotalCents)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${toEuros(i.subtotalCents)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${toEuros(i.totalCents)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${toEuros(i.totalCents)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

${lines}
</Invoice>
`;
}
