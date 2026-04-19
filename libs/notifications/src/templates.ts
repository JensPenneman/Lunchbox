export interface OrderEmailData {
  orderId: string;
  tenantName: string;
  customerName: string;
  items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  totalCents: number;
  vatCents: number;
  notes?: string | null;
}

function eur(cents: number) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function itemsHtml(items: OrderEmailData['items']) {
  return items
    .map(
      (it) =>
        `<tr><td style="padding:4px 8px">${escape(it.name)}</td><td style="padding:4px 8px;text-align:right">× ${it.quantity}</td><td style="padding:4px 8px;text-align:right">${eur(it.lineTotalCents)}</td></tr>`,
    )
    .join('');
}

function itemsText(items: OrderEmailData['items']) {
  return items.map((it) => `  ${it.quantity}× ${it.name} — ${eur(it.lineTotalCents)}`).join('\n');
}

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function orderConfirmationEmail(d: OrderEmailData & { customerEmail: string }) {
  const subject = `Order confirmation · ${d.tenantName} · #${d.orderId.slice(0, 8)}`;
  const text = `Hi ${d.customerName},

Thanks for your order at ${d.tenantName}. Here's your receipt:

${itemsText(d.items)}

VAT: ${eur(d.vatCents)}
Total: ${eur(d.totalCents)}

Order ref: ${d.orderId}

— Lunchbox`;
  const html = `<div style="font-family:system-ui,sans-serif;color:#1c1917;max-width:480px">
  <h1 style="font-size:20px">Order confirmed 🥪</h1>
  <p>Hi ${escape(d.customerName)}, thanks for your order at <strong>${escape(d.tenantName)}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml(d.items)}</table>
  <p style="text-align:right;color:#57534e">VAT: ${eur(d.vatCents)}</p>
  <p style="text-align:right;font-size:18px;font-weight:600">Total: ${eur(d.totalCents)}</p>
  ${d.notes ? `<p style="background:#fafaf9;padding:8px;border-radius:4px"><strong>Your note:</strong> ${escape(d.notes)}</p>` : ''}
  <p style="color:#a8a29e;font-size:12px">Order ref: ${d.orderId}</p>
</div>`;
  return {
    to: d.customerEmail,
    subject,
    html,
    text,
  };
}

export function merchantNewOrderEmail(d: OrderEmailData & { merchantEmail: string; customerEmail: string }) {
  const subject = `New order · #${d.orderId.slice(0, 8)} · ${eur(d.totalCents)}`;
  const text = `New paid order for ${d.tenantName}:

${itemsText(d.items)}

Customer: ${d.customerName} <${d.customerEmail}>
Total: ${eur(d.totalCents)} (incl. VAT ${eur(d.vatCents)})
${d.notes ? `Note: ${d.notes}\n` : ''}
Head to the merchant dashboard to accept it.`;
  const html = `<div style="font-family:system-ui,sans-serif;color:#1c1917;max-width:480px">
  <h1 style="font-size:20px">New paid order</h1>
  <p>Ticket for <strong>${escape(d.tenantName)}</strong>:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml(d.items)}</table>
  <p>Customer: ${escape(d.customerName)} &lt;${escape(d.customerEmail)}&gt;</p>
  <p style="text-align:right;font-size:18px;font-weight:600">Total: ${eur(d.totalCents)}</p>
  ${d.notes ? `<p style="background:#fafaf9;padding:8px;border-radius:4px"><strong>Customer note:</strong> ${escape(d.notes)}</p>` : ''}
  <p><a href="http://localhost:4200" style="color:#b45309">Open merchant dashboard →</a></p>
</div>`;
  return { to: d.merchantEmail, subject, html, text };
}
