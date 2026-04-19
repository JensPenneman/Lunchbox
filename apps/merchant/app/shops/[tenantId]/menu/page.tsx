'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '@lunchbox/trpc-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Money,
  Textarea,
} from '@lunchbox/ui';
import { ShopShell } from '../_layout';

export default function MenuPage() {
  const params = useParams<{ tenantId: string }>();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const products = useQuery(trpc.merchant.productsList.queryOptions({ tenantId: params.tenantId }));

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: trpc.merchant.productsList.queryKey() });

  const createProduct = useMutation(trpc.merchant.productCreate.mutationOptions({ onSuccess: invalidate }));
  const updateProduct = useMutation(trpc.merchant.productUpdate.mutationOptions({ onSuccess: invalidate }));
  const deleteProduct = useMutation(trpc.merchant.productDelete.mutationOptions({ onSuccess: invalidate }));

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');

  return (
    <ShopShell>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Menu</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add product</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              const price = Math.round(parseFloat(newPrice.replace(',', '.')) * 100);
              if (!newName || Number.isNaN(price) || price <= 0) return;
              createProduct.mutate(
                {
                  tenantId: params.tenantId,
                  data: {
                    name: newName,
                    description: newDescription || null,
                    priceCents: price,
                    vatRate: 1200,
                    isTakeawayPrepared: true,
                    available: true,
                    imageUrl: null,
                  },
                },
                {
                  onSuccess: () => {
                    setNewName('');
                    setNewPrice('');
                    setNewDescription('');
                  },
                },
              );
            }}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="price">Price (EUR)</Label>
              <Input
                id="price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="4.50"
                inputMode="decimal"
                required
              />
            </div>
            <Button type="submit" className="self-end" disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {products.isLoading && <div className="text-stone-500">Loading menu…</div>}
      {products.data && products.data.length === 0 && (
        <EmptyState title="No products yet" description="Use the form above to add your first sandwich." />
      )}

      <div className="space-y-3">
        {products.data?.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {!p.available && <Badge variant="secondary">Hidden</Badge>}
                </div>
                {p.description && <p className="text-sm text-stone-500">{p.description}</p>}
                <p className="text-xs text-stone-400">
                  VAT {p.vatRate / 100}% · {p.isTakeawayPrepared ? 'takeaway prepared' : 'other'}
                </p>
              </div>
              <div className="w-24 text-right font-medium">
                <Money cents={p.priceCents} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProduct.mutate({
                      tenantId: params.tenantId,
                      id: p.id,
                      patch: { available: !p.available },
                    })
                  }
                  disabled={updateProduct.isPending}
                >
                  {p.available ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    deleteProduct.mutate({ tenantId: params.tenantId, id: p.id })
                  }
                  disabled={deleteProduct.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ShopShell>
  );
}
