'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useTRPC, useSession } from '@lunchbox/trpc-client';
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Money,
  EmptyState,
  Input,
  Label,
  Textarea,
} from '@lunchbox/ui';
import { useState } from 'react';
import { HeaderActions } from '../_components/header-actions';
import { useCart } from '../_store/cart';

export default function CartPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: session } = useSession();
  const lines = useCart((s) => s.lines);
  const tenantSlug = useCart((s) => s.tenantSlug);
  const setQty = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const [notes, setNotes] = useState('');

  const place = useMutation(
    trpc.orders.place.mutationOptions({
      onSuccess: async (order) => {
        clear();
        router.push(`/checkout/${order.id}`);
      },
    }),
  );

  const total = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const tenantId = lines[0]?.tenantId;

  return (
    <AppShell
      brand={<Link href="/">🥪 Lunchbox</Link>}
      actions={<HeaderActions />}
    >
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Your cart</h1>

      {lines.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Head back to a shop and add some sandwiches."
          action={
            <Link href="/">
              <Button>Browse shops</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {lines.map((l) => (
              <Card key={l.productId}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex-1">
                    <div className="font-medium">{l.productName}</div>
                    <div className="text-sm text-stone-500">
                      <Money cents={l.unitPriceCents} /> each
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQty(l.productId, l.quantity - 1)}>
                      −
                    </Button>
                    <span className="w-6 text-center font-medium">{l.quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => setQty(l.productId, l.quantity + 1)}>
                      +
                    </Button>
                  </div>
                  <div className="w-24 text-right font-medium">
                    <Money cents={l.unitPriceCents * l.quantity} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(l.productId)}>
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Pickup notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="notes">Anything the shop should know?</Label>
                <Textarea
                  id="notes"
                  className="mt-2"
                  placeholder="Allergies, timing, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm text-stone-500">
                  <span>Items</span>
                  <span>{lines.reduce((n, l) => n + l.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total (incl. VAT)</span>
                  <Money cents={total} />
                </div>

                {!session?.user ? (
                  <div className="space-y-2 rounded-md bg-amber-50 p-3 text-sm">
                    <p>Sign in to place your order.</p>
                    <Link href={`/sign-in?next=${encodeURIComponent('/cart')}`}>
                      <Button className="w-full">Sign in</Button>
                    </Link>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={place.isPending}
                    onClick={() =>
                      tenantId &&
                      place.mutate({
                        tenantId,
                        fulfillmentType: 'PICKUP',
                        notes: notes || null,
                        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
                      })
                    }
                  >
                    {place.isPending ? 'Placing…' : 'Place order'}
                  </Button>
                )}
                {place.isError && (
                  <p className="text-sm text-red-600">{place.error.message}</p>
                )}
                {tenantSlug && (
                  <Link href={`/shop/${tenantSlug}`} className="block text-center text-sm text-stone-500 hover:underline">
                    ← Keep browsing {tenantSlug}
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
