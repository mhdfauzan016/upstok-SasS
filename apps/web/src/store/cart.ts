import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/mock/types";

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string, size?: string, color?: string) => void;
  setQty: (productId: string, qty: number, size?: string, color?: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
};

const sameLine = (a: CartItem, productId: string, size?: string, color?: string) =>
  a.productId === productId && a.size === size && a.color === color;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const idx = s.items.findIndex((x) => sameLine(x, item.productId, item.size, item.color));
          if (idx >= 0) {
            const next = [...s.items];
            next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
            return { items: next };
          }
          return { items: [...s.items, item] };
        }),
      remove: (productId, size, color) =>
        set((s) => ({ items: s.items.filter((x) => !sameLine(x, productId, size, color)) })),
      setQty: (productId, qty, size, color) =>
        set((s) => ({
          items: s.items.map((x) =>
            sameLine(x, productId, size, color) ? { ...x, qty: Math.max(1, qty) } : x,
          ),
        })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, it) => sum + it.price * it.qty, 0),
      count: () => get().items.reduce((sum, it) => sum + it.qty, 0),
    }),
    { name: "upstok-cart" },
  ),
);
