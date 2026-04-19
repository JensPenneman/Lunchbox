'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { AppShell } from '@lunchbox/ui';
import { HeaderActions } from '../../_components/header';

export function ShopShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ tenantId: string }>();
  const pathname = usePathname();
  const base = `/shops/${params.tenantId}`;
  const isOrders = pathname?.endsWith('/orders');
  const isMenu = pathname?.endsWith('/menu');
  return (
    <AppShell
      brand={<Link href="/">🧑‍🍳 Lunchbox Merchant</Link>}
      nav={
        <>
          <Link
            href={`${base}/orders`}
            className={isOrders ? 'font-medium text-amber-700' : 'text-stone-700 hover:text-stone-900'}
          >
            Live orders
          </Link>
          <Link
            href={`${base}/menu`}
            className={isMenu ? 'font-medium text-amber-700' : 'text-stone-700 hover:text-stone-900'}
          >
            Menu
          </Link>
          <Link href="/" className="text-stone-700 hover:text-stone-900">
            All shops
          </Link>
        </>
      }
      actions={<HeaderActions />}
    >
      {children}
    </AppShell>
  );
}
