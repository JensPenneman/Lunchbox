'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTRPC } from '@lunchbox/trpc-client';
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Money,
  EmptyState,
} from '@lunchbox/ui';
import { HeaderActions } from '../../_components/header-actions';
import { useCart } from '../../_store/cart';

export default function ShopPage() {
  const params = useParams<{ slug: string }>();
  const trpc = useTRPC();
  const shop = useQuery(trpc.tenants.getBySlug.queryOptions({ slug: params.slug }));
  const add = useCart((s) => s.add);

  return (
    <AppShell
      brand={<Link href="/">🥪 Lunchbox</Link>}
      nav={
        <>
          <Link href="/" className="text-stone-700 hover:text-stone-900">Shops</Link>
          <Link href="/orders" className="text-stone-700 hover:text-stone-900">My orders</Link>
        </>
      }
      actions={<HeaderActions />}
    >
      {shop.isLoading && <div className="text-stone-500">Loading menu…</div>}
      {shop.isError && (
        <EmptyState title="Shop not found" description="This shop may be closed or removed." />
      )}
      {shop.data && (
        <>
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">{shop.data.name}</h1>
            {shop.data.description && (
              <p className="mt-1 text-stone-600">{shop.data.description}</p>
            )}
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shop.data.products.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  {p.description && <CardDescription>{p.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-lg font-medium">
                    <Money cents={p.priceCents} />
                  </span>
                  <Button
                    size="sm"
                    onClick={() =>
                      add({
                        productId: p.id,
                        productName: p.name,
                        unitPriceCents: p.priceCents,
                        vatRate: p.vatRate,
                        tenantId: shop.data.id,
                        tenantSlug: shop.data.slug,
                      })
                    }
                  >
                    Add to cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
