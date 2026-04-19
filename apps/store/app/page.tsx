'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTRPC, useSession } from '@lunchbox/trpc-client';
import { useT } from '@lunchbox/i18n';
import { AppShell, Card, CardContent, CardHeader, CardTitle, CardDescription, Button, EmptyState } from '@lunchbox/ui';
import { HeaderActions } from './_components/header-actions';

export default function Home() {
  const trpc = useTRPC();
  const tenants = useQuery(trpc.tenants.listPublic.queryOptions());
  const t = useT();
  useSession();

  return (
    <AppShell
      brand={
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🥪</span>
          <span>Lunchbox</span>
        </Link>
      }
      nav={
        <>
          <Link href="/" className="text-stone-700 hover:text-stone-900">
            {t.common.shops}
          </Link>
          <Link href="/orders" className="text-stone-700 hover:text-stone-900">
            {t.common.myOrders}
          </Link>
        </>
      }
      actions={<HeaderActions />}
    >
      <section className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t.home.title}</h1>
        <p className="mt-1 text-stone-600">{t.home.subtitle}</p>
      </section>

      {tenants.isLoading && <div className="text-stone-500">{t.common.loading}</div>}

      {tenants.data && tenants.data.length === 0 && (
        <EmptyState title={t.home.noShops} description={t.home.noShopsDesc} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenants.data?.map((tenant) => (
          <Link key={tenant.id} href={`/shop/${tenant.slug}`} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{tenant.name}</CardTitle>
                {tenant.description && <CardDescription>{tenant.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  {t.home.orderNow}
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
