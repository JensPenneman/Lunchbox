'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTRPC, useTRPCClient, downloadAsFile } from '@lunchbox/trpc-client';
import { useT } from '@lunchbox/i18n';
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Money,
  Badge,
  OrderProgress,
} from '@lunchbox/ui';
import { HeaderActions } from '../../_components/header-actions';
import { useState } from 'react';

export default function CheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const t = useT();
  const [downloading, setDownloading] = useState(false);
  const order = useQuery({
    ...trpc.orders.getMine.queryOptions({ orderId: params.orderId }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      if (status === 'FULFILLED' || status === 'CANCELLED') return false;
      return 5000; // Poll while the order is live
    },
  });
  const pay = useMutation(
    trpc.orders.markPaid.mutationOptions({
      onSuccess: () => order.refetch(),
    }),
  );

  async function handleDownloadInvoice() {
    if (!order.data) return;
    setDownloading(true);
    try {
      const { xml, filename, contentType } = await client.invoicing.orderInvoiceXml.query({
        orderId: order.data.id,
      });
      downloadAsFile({ content: xml, filename, contentType });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AppShell brand={<Link href="/">🥪 Lunchbox</Link>} actions={<HeaderActions />}>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{t.checkout.title}</h1>

      {order.isLoading && <div className="text-stone-500">{t.common.loading}</div>}
      {order.data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order #{order.data.id.slice(0, 8)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-stone-500">
                  {t.checkout.orderFrom} {order.data.tenant.name}
                </div>
                {order.data.items.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>
                      {it.quantity}× {it.nameSnapshot}
                    </span>
                    <Money cents={it.lineTotalCents} />
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 text-stone-600">
                  <span>{t.checkout.subtotal}</span>
                  <Money cents={order.data.subtotalCents} />
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{t.checkout.vat}</span>
                  <Money cents={order.data.vatTotalCents} />
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>{t.checkout.total}</span>
                  <Money cents={order.data.totalCents} />
                </div>
              </CardContent>
            </Card>

            {order.data.status !== 'PENDING_PAYMENT' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderProgress status={order.data.status} />
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>{t.checkout.payment}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-500">{t.checkout.status}</span>
                  <StatusBadge status={order.data.status} />
                </div>
                {order.data.status === 'PENDING_PAYMENT' && (
                  <>
                    <p className="text-sm text-stone-600">
                      This is a PoC — paying is simulated. In production this triggers Bancontact
                      Pay / meal voucher flow.
                    </p>
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={pay.isPending}
                      onClick={() => pay.mutate({ orderId: order.data!.id })}
                    >
                      {pay.isPending ? t.checkout.processing : t.checkout.payNow}
                    </Button>
                  </>
                )}
                {order.data.status !== 'PENDING_PAYMENT' && (
                  <>
                    <p className="text-sm text-emerald-700">{t.checkout.paidNote}</p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDownloadInvoice}
                      disabled={downloading}
                    >
                      {downloading ? t.checkout.generating : t.checkout.downloadInvoice}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => router.push('/orders')}
                    >
                      {t.checkout.viewMyOrders}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'PENDING_PAYMENT'
      ? 'warning'
      : status === 'CANCELLED'
      ? 'destructive'
      : status === 'FULFILLED'
      ? 'success'
      : 'default';
  return (
    <Badge variant={variant as 'warning' | 'destructive' | 'success' | 'default'}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
