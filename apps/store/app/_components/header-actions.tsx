'use client';

import Link from 'next/link';
import { useSession, signOut } from '@lunchbox/trpc-client';
import { useT } from '@lunchbox/i18n';
import { Button, Badge } from '@lunchbox/ui';
import { useCart } from '../_store/cart';
import { LocaleSwitcher } from './locale-switcher';

export function HeaderActions() {
  const { data: session, isPending } = useSession();
  const cartCount = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const t = useT();

  if (isPending) return <span className="text-sm text-stone-400">…</span>;

  return (
    <div className="flex items-center gap-3">
      <LocaleSwitcher />
      {cartCount > 0 && (
        <Link href="/cart">
          <Button variant="outline" size="sm">
            {t.common.cart}{' '}
            <Badge variant="default" className="ml-1">
              {cartCount}
            </Badge>
          </Button>
        </Link>
      )}
      {session?.user ? (
        <>
          <span className="text-sm text-stone-600">{session.user.name ?? session.user.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })
            }
          >
            {t.common.signOut}
          </Button>
        </>
      ) : (
        <>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              {t.common.signIn}
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">{t.common.signUp}</Button>
          </Link>
        </>
      )}
    </div>
  );
}
