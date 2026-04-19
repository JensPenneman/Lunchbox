'use client';

import Link from 'next/link';
import { useSession, signOut } from '@lunchbox/trpc-client';
import { AppShell, Button, Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@lunchbox/ui';

export default function SupplierHome() {
  const { data: session, isPending } = useSession();

  return (
    <AppShell
      brand={<Link href="/">🥬 Lunchbox Supplier</Link>}
      actions={
        session?.user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-600">{session.user.name ?? session.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })
              }
            >
              Sign out
            </Button>
          </div>
        ) : (
          <Link href="/sign-in">
            <Button size="sm">Sign in</Button>
          </Link>
        )
      }
    >
      {isPending && <div className="text-stone-500">Loading…</div>}

      {!isPending && !session?.user && (
        <EmptyState
          title="Supplier portal"
          description="Sign in to manage your catalog and incoming orders from Lunchbox merchants."
          action={
            <Link href="/sign-in">
              <Button>Sign in</Button>
            </Link>
          }
        />
      )}

      {session?.user && (
        <>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Supplier dashboard</h1>
          <p className="mb-8 text-stone-600">
            Welcome, {session.user.name ?? session.user.email}. The supplier module is a stub for now —
            wiring is already in place (auth, shared tRPC, shared types) to add real functionality without
            re-architecting.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <Stub title="Catalog" desc="Manage SKUs, pack sizes, and pricing for Lunchbox merchants." />
            <Stub title="Incoming orders" desc="Merchants will order supplies here. Draft schema already exists in the shared db lib." />
            <Stub title="Invoicing" desc="Outbound Peppol invoices to merchants (B2B, mandatory since Jan 2026)." />
          </div>
        </>
      )}
    </AppShell>
  );
}

function Stub({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="secondary">Planned</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-stone-500">{desc}</p>
      </CardContent>
    </Card>
  );
}
