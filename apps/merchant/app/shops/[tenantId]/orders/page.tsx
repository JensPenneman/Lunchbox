'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@lunchbox/trpc-client';
import type { OrderStatus } from '@lunchbox/contracts';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Money, EmptyState } from '@lunchbox/ui';
import { ShopShell } from '../_layout';

export default function OrdersPage() {
  const params = useParams<{ tenantId: string }>();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const orders = useQuery({
    ...trpc.merchant.ordersList.queryOptions({ tenantId: params.tenantId }),
    refetchInterval: 5000,
  });
  const stats = useQuery({
    ...trpc.merchant.stats.queryOptions({ tenantId: params.tenantId }),
    refetchInterval: 10000,
  });
  const transition = useMutation(
    trpc.merchant.ordersTransition.mutationOptions({
      onSuccess: () =>
        Promise.all([
          qc.invalidateQueries({ queryKey: trpc.merchant.ordersList.queryKey() }),
          qc.invalidateQueries({ queryKey: trpc.merchant.stats.queryKey() }),
        ]),
    }),
  );

  return (
    <ShopShell>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Live orders</h1>

      {stats.data && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Card><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-stone-500">Open now</div><div className="mt-1 text-2xl font-semibold">{stats.data.openOrders}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-stone-500">Today</div><div className="mt-1 text-2xl font-semibold">{stats.data.todayOrders}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-stone-500">Revenue today</div><div className="mt-1 text-2xl font-semibold"><Money cents={stats.data.todayRevenueCents} /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-stone-500">VAT today</div><div className="mt-1 text-2xl font-semibold"><Money cents={stats.data.todayVatCents} /></div></CardContent></Card>
        </div>
      )}
      {orders.isLoading && <div className="text-stone-500">Loading…</div>}
      {orders.data && orders.data.length === 0 && (
        <EmptyState
          title="No orders yet"
          description="When customers place orders, they'll show up here — refreshed every 5 seconds."
        />
      )}
      <div className="space-y-3">
        {orders.data?.map((o) => {
          const next = nextTransitions(o.status);
          return (
            <Card key={o.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    #{o.id.slice(0, 8)} · {o.customer.name ?? o.customer.email}
                  </CardTitle>
                  <div className="text-xs text-stone-500">
                    {new Date(o.placedAt).toLocaleString('nl-BE')} · {o.fulfillmentType.toLowerCase()}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>
                        {it.quantity}× {it.nameSnapshot}
                      </span>
                      <Money cents={it.lineTotalCents} />
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="rounded-md bg-stone-50 p-2 text-sm text-stone-700">
                    <strong>Note:</strong> {o.notes}
                  </p>
                )}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-stone-500">
                    Total: <span className="font-medium text-stone-900"><Money cents={o.totalCents} /></span>
                  </span>
                  <div className="flex gap-2">
                    {next.map((to) => (
                      <Button
                        key={to}
                        size="sm"
                        variant={to === 'CANCELLED' ? 'destructive' : to === 'ACCEPTED' ? 'default' : 'outline'}
                        disabled={transition.isPending}
                        onClick={() =>
                          transition.mutate({ tenantId: params.tenantId, orderId: o.id, to })
                        }
                      >
                        {labelFor(to)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ShopShell>
  );
}

type MerchantTransition = 'ACCEPTED' | 'PREPARING' | 'READY' | 'FULFILLED' | 'CANCELLED';

function nextTransitions(s: OrderStatus): MerchantTransition[] {
  switch (s) {
    case 'PAID':
      return ['ACCEPTED', 'CANCELLED'];
    case 'ACCEPTED':
      return ['PREPARING', 'CANCELLED'];
    case 'PREPARING':
      return ['READY', 'CANCELLED'];
    case 'READY':
      return ['FULFILLED', 'CANCELLED'];
    default:
      return [];
  }
}

function labelFor(to: MerchantTransition): string {
  switch (to) {
    case 'ACCEPTED':
      return 'Accept';
    case 'PREPARING':
      return 'Start preparing';
    case 'READY':
      return 'Ready for pickup';
    case 'FULFILLED':
      return 'Fulfilled';
    case 'CANCELLED':
      return 'Cancel';
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === 'PAID' ? 'warning'
      : status === 'ACCEPTED' || status === 'PREPARING' ? 'default'
      : status === 'READY' ? 'success'
      : status === 'FULFILLED' ? 'success'
      : status === 'CANCELLED' ? 'destructive'
      : 'secondary';
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>;
}
