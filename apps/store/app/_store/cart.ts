'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  productName: string;
  unitPriceCents: number;
  vatRate: number;
  quantity: number;
  tenantId: string;
  tenantSlug: string;
}

interface CartState {
  lines: CartItem[];
  tenantSlug: string | null;
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      tenantSlug: null,
      add: (item) => {
        const existing = get().lines.find((l) => l.productId === item.productId);
        const qty = item.quantity ?? 1;
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.productId === item.productId ? { ...l, quantity: l.quantity + qty } : l,
            ),
          });
          return;
        }
        // Switching shops clears the cart.
        if (get().tenantSlug && get().tenantSlug !== item.tenantSlug) {
          set({ lines: [{ ...item, quantity: qty }], tenantSlug: item.tenantSlug });
          return;
        }
        set({
          lines: [...get().lines, { ...item, quantity: qty }],
          tenantSlug: item.tenantSlug,
        });
      },
      remove: (productId) => {
        const next = get().lines.filter((l) => l.productId !== productId);
        set({ lines: next, tenantSlug: next.length ? get().tenantSlug : null });
      },
      setQuantity: (productId, qty) => {
        if (qty <= 0) return get().remove(productId);
        set({
          lines: get().lines.map((l) =>
            l.productId === productId ? { ...l, quantity: qty } : l,
          ),
        });
      },
      clear: () => set({ lines: [], tenantSlug: null }),
    }),
    { name: 'lunchbox-cart' },
  ),
);
