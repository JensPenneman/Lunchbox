'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTRPC, useSession, useTRPCClient, downloadAsFile } from '@lunchbox/trpc-client';
import { AppShell, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Money } from '@lunchbox/ui';
import { HeaderActions } from './_components/header';
import { useState } from 'react';

export default function AccountingHome() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const { data: session, isPending } = useSession();
  const ledger = useQuery({
    ...trpc.accounting.ledger.queryOptions(),
    enabled: !!session?.user,
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(orderId: string) {
    setDownloadingId(orderId);
    try {
      const { xml, filename, contentType } = await client.invoicing.orderInvoiceXml.query({ orderId });
      downloadAsFile({ content: xml, filename, contentType });
    } finally {
      setDownloadingId(null);
    }
  }

  const notAuthorized = ledger.error?.data?.code === 'FORBIDDEN';

  const platformTotals = ledger.data?.byTenant.reduce(
    (acc, row) => ({
      orders: acc.orders + row.orderCount,
      subtotal: acc.subtotal + row.subtotalCents,
      vat: acc.vat + row.vatCents,
      total: acc.total + row.totalCents,
    }),
    { orders: 0, subtotal: 0, vat: 0, total: 0 },
  );

  // VAT breakdown by rate
  const vatByRate = ledger.data
    ? (() => {
        const byRate = new Map<number, { taxable: number; vat: number; lines: number }>();
        for (const o of ledger.data.orders) {
          for (const it of o.items) {
            const net = it.lineTotalCents - Math.round((it.lineTotalCents * it.vatRate) / (10000 + it.vatRate));
            const vat = it.lineTotalCents - net;
            const cur = byRate.get(it.vatRate) ?? { taxable: 0, vat: 0, lines: 0 };
            cur.taxable += net;
            cur.vat += vat;
            cur.lines += 1;
            byRate.set(it.vatRate, cur);
          }
        }
        return Array.from(byRate.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([rate, v]) => ({ rate, ...v }));
      })()
    : [];

  return (
    <AppShell
      brand={<Link href="/">📒 Lunchbox Accounting</Link>}
      actions={<HeaderActions />}
    >
      {isPending && <div className="text-stone-500">Loading…</div>}
      {!isPending && !session?.user && (
        <EmptyState
          title="Sign in to view the ledger"
          action={
            <Link href="/sign-in">
              <Button>Sign in</Button>
            </Link>
          }
        />
      )}

      {session?.user && notAuthorized && (
        <EmptyState
          title="Accountant access required"
          description="Your account does not have the ACCOUNTANT platform role."
        />
      )}

      {ledger.data && (
        <>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Platform ledger</h1>
          <p className="mb-8 text-stone-600">
            Live roll-up of paid orders across all tenants. VAT broken down per rate and per tenant.
            Download any order as a Peppol UBL BIS 3.0 invoice.
          </p>

          {platformTotals && (
            <div className="mb-8 grid gap-4 sm:grid-cols-4">
              <Stat label="Orders" value={platformTotals.orders.toString()} />
              <Stat label="Subtotal (ex VAT)" value={<Money cents={platformTotals.subtotal} />} />
              <Stat label="VAT collected" value={<Money cents={platformTotals.vat} />} />
              <Stat label="Gross total" value={<Money cents={platformTotals.total} />} />
            </div>
          )}

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>VAT by rate</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-stone-50 text-left text-stone-500">
                  <tr>
                    <th className="p-3">Rate</th>
                    <th className="p-3 text-right">Lines</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">VAT</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {vatByRate.map((row) => (
                    <tr key={row.rate} className="border-b last:border-b-0">
                      <td className="p-3 font-medium">{(row.rate / 100).toFixed(0)}%</td>
                      <td className="p-3 text-right tabular-nums">{row.lines}</td>
                      <td className="p-3 text-right"><Money cents={row.taxable} /></td>
                      <td className="p-3 text-right font-medium"><Money cents={row.vat} /></td>
                      <td className="p-3 text-stone-500">{vatNoteFor(row.rate)}</td>
                    </tr>
                  ))}
                  {vatByRate.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-stone-400">No taxable lines yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By tenant</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-stone-50 text-left text-stone-500">
                  <tr>
                    <th className="p-3">Tenant</th>
                    <th className="p-3">BTW / VAT #</th>
                    <th className="p-3 text-right">Orders</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-right">VAT</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.data.byTenant.map((row) => (
                    <tr key={row.tenantId} className="border-b last:border-b-0">
                      <td className="p-3 font-medium">{row.tenantName}</td>
                      <td className="p-3 text-stone-500">
                        {row.vatNumber ? <code>{row.vatNumber}</code> : <span className="text-stone-400">—</span>}
                      </td>
                      <td className="p-3 text-right tabular-nums">{row.orderCount}</td>
                      <td className="p-3 text-right"><Money cents={row.subtotalCents} /></td>
                      <td className="p-3 text-right"><Money cents={row.vatCents} /></td>
                      <td className="p-3 text-right font-medium"><Money cents={row.totalCents} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ledger.data.orders.slice(0, 20).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">#{o.id.slice(0, 8)} · {o.tenant.name}</div>
                    <div className="text-xs text-stone-500">
                      {new Date(o.placedAt).toLocaleString('nl-BE')}
                    </div>
                  </div>
                  <Badge variant="secondary">{o.status.replace(/_/g, ' ')}</Badge>
                  <div className="w-20 text-right font-medium">
                    <Money cents={o.totalCents} />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadingId === o.id}
                    onClick={() => handleDownload(o.id)}
                  >
                    {downloadingId === o.id ? '…' : 'UBL invoice'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function vatNoteFor(rateBp: number): string {
  if (rateBp === 600) return 'Cold beverages, unprocessed food';
  if (rateBp === 1200) return 'Takeaway prepared meals (BE 2026+)';
  if (rateBp === 2100) return 'Standard rate (alcohol, soft drinks)';
  return '';
}
