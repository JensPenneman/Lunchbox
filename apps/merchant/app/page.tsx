'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTRPC, useSession } from '@lunchbox/trpc-client';
import { AppShell, Card, CardContent, CardHeader, CardTitle, Button, EmptyState } from '@lunchbox/ui';
import { HeaderActions } from './_components/header';

export default function MerchantHome() {
  const trpc = useTRPC();
  const { data: session, isPending } = useSession();
  const memberships = useQuery({
    ...trpc.me.merchantMemberships.queryOptions(),
    enabled: !!session?.user,
  });

  return (
    <AppShell
      brand={<Link href="/">🧑‍🍳 Lunchbox Merchant</Link>}
      actions={<HeaderActions />}
    >
      {isPending && <div className="text-stone-500">Loading…</div>}
      {!isPending && !session?.user && (
        <EmptyState
          title="Sign in to manage your shop"
          description="The merchant dashboard is for shop owners and staff."
          action={
            <Link href="/sign-in">
              <Button>Sign in</Button>
            </Link>
          }
        />
      )}

      {session?.user && memberships.data && (
        <>
          <h1 className="mb-6 text-3xl font-semibold tracking-tight">Your shops</h1>
          {memberships.data.length === 0 ? (
            <EmptyState
              title="You're not a member of any shop"
              description="Ask an existing owner to invite you, or contact support to onboard a new shop."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memberships.data.map((m) => (
                <Card key={m.id}>
                  <CardHeader>
                    <CardTitle>{m.tenant.name}</CardTitle>
                    <p className="text-sm text-stone-500">Role: {m.role}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Link href={`/shops/${m.tenant.id}/orders`}>
                      <Button className="w-full">Live orders</Button>
                    </Link>
                    <Link href={`/shops/${m.tenant.id}/menu`}>
                      <Button variant="outline" className="w-full">Manage menu</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
