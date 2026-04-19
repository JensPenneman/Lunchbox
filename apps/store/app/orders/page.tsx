'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTRPC, useSession } from '@lunchbox/trpc-client';
import { AppShell, Card, CardContent, CardHeader, CardTitle, Badge, EmptyState, Button, Money } from '@lunchbox/ui';
import { HeaderActions } from '../_components/header-actions';

export default function OrdersPage() {
  const trpc = useTRPC();
  const { data: session, isPending } = useSession();
  const orders = useQuery({
    ...trpc.orders.myList.queryOptions(),
    enabled: !!session?.user,
  });

  return (
    <AppShell brand={<Link href="/">🥪 Lunchbox</Link>} actions={<HeaderActions />}>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">My orders</h1>

      {isPending && <div className="text-stone-500">Loading…</div>}
      {!isPending && !session?.user && (
        <EmptyState
          title="Sign in to see your orders"
          action={
            <Link href="/sign-in?next=/orders">
              <Button>Sign in</Button>
            </Link>
          }
        />
      )}

      {orders.data && orders.data.length === 0 && (
        <EmptyState
          title="No orders yet"
          description="Place one from a shop to see it here."
          action={
            <Link href="/">
              <Button>Browse shops</Button>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {orders.data?.map((o) => (
          <Link key={o.id} href={`/checkout/${o.id}`} className="block">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{o.tenant.name}</CardTitle>
                  <div className="text-xs text-stone-500">
                    {new Date(o.placedAt).toLocaleString('nl-BE')}
                  </div>
                </div>
                <Badge variant={badgeVariant(o.status)}>{o.status.replace(/_/g, ' ')}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-stone-600">
                  {o.items.length} item{o.items.length === 1 ? '' : 's'}
                </span>
                <span className="font-medium">
                  <Money cents={o.totalCents} />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function badgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'PENDING_PAYMENT') return 'warning';
  if (status === 'CANCELLED') return 'destructive';
  if (status === 'FULFILLED') return 'success';
  return 'secondary';
}
