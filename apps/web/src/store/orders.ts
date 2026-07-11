import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order, OrderStatus, InventoryLog } from "@/mock/types";
import { initialOrders, initialInventoryLogs } from "@/mock/data";

type OrdersState = {
  orders: Order[];
  inventoryLogs: InventoryLog[];
  addOrder: (o: Order) => void;
  updateStatus: (id: string, status: OrderStatus) => void;
  addInventoryLog: (l: InventoryLog) => void;
};

export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
      orders: initialOrders,
      inventoryLogs: initialInventoryLogs,
      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
      updateStatus: (id, status) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
        })),
      addInventoryLog: (l) => set((s) => ({ inventoryLogs: [l, ...s.inventoryLogs] })),
    }),
    { name: "upstok-orders", version: 1 },
  ),
);
