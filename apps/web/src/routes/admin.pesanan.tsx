import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminOrders, useOrder, useUpdateOrderStatus, useBranding } from "@/hooks/queries";
import { rupiah, formatDateTime } from "@/lib/format";
import { buildWhatsAppApiOrderUrl } from "@/lib/whatsapp";
import type { ApiOrderStatus } from "@/lib/api/types";
import { Search, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pesanan")({
  head: () => ({ meta: [{ title: "Pesanan — Admin" }] }),
  component: AdminPesanan,
});

const STATUSES: ApiOrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];
const statusLabel: Record<ApiOrderStatus, string> = {
  pending: "Pending",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};
const statusColors: Record<ApiOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

/** API money is in minor units; the storefront shows whole rupiah. */
const toRupiah = (minor: number) => rupiah(Math.round(minor / 100));

function AdminPesanan() {
  const [tab, setTab] = useState<ApiOrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading } = useAdminOrders({
    status: tab === "all" ? undefined : tab,
    search: q || undefined,
  });
  const orders = data?.items ?? [];

  return (
    <AdminShell title="Manajemen Pesanan">
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-1.5">
          <div className="flex flex-wrap gap-1">
            <Tab active={tab === "all"} onClick={() => setTab("all")}>
              Semua
            </Tab>
            {STATUSES.map((s) => (
              <Tab key={s} active={tab === s} onClick={() => setTab(s)}>
                {statusLabel[s]}
              </Tab>
            ))}
          </div>
        </div>
        <div className="border-b border-border p-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari no pesanan, nama, no HP..."
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">No Pesanan</th>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Tanggal</th>
                <th className="px-4 py-3 font-bold text-right">Total</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Memuat...
                  </td>
                </tr>
              )}
              {!isLoading &&
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-t border-border hover:bg-secondary/30"
                    onClick={() => setActiveId(o.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customer.name}</div>
                      <div className="text-xs text-muted-foreground">{o.customer.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand">
                      {toRupiah(o.total.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusColors[o.status]}`}>
                        {statusLabel[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs font-bold text-primary hover:underline">
                        Lihat →
                      </button>
                    </td>
                  </tr>
                ))}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Tidak ada pesanan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeId && (
        <OrderDrawer id={activeId} onClose={() => setActiveId(null)} />
      )}
    </AdminShell>
  );
}

function OrderDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: order, isLoading } = useOrder(id);
  const { data: branding } = useBranding();
  const updateStatus = useUpdateOrderStatus();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-auto bg-card shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-5">
          <div>
            <h3 className="font-bold">Detail Pesanan</h3>
            <p className="font-mono text-xs text-muted-foreground">
              {order?.orderNumber ?? "..."}
            </p>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        {isLoading || !order ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : (
          <div className="space-y-5 p-5">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Status
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate(
                        { id: order.id, status: s },
                        {
                          onSuccess: () => toast.success("Status diperbarui"),
                          onError: () => toast.error("Gagal memperbarui status"),
                        },
                      )
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                      order.status === s
                        ? statusColors[s]
                        : "border border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Customer
              </div>
              <div className="rounded-lg border border-border p-4 text-sm">
                <div className="font-bold">{order.customer.name}</div>
                <div className="text-muted-foreground">{order.customer.phone}</div>
                <div className="mt-2 text-sm">{order.customer.address}</div>
                {order.customer.notes && (
                  <div className="mt-3 rounded bg-secondary/50 p-2 text-xs italic">
                    "{order.customer.notes}"
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Item
              </div>
              <div className="space-y-2">
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{it.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.sku} • {it.quantity} × {toRupiah(it.unitPrice.amount)}
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold">
                      {toRupiah(it.lineTotal.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Total Pesanan</span>
                <span className="text-2xl font-extrabold text-brand">
                  {toRupiah(order.total.amount)}
                </span>
              </div>
            </div>

            <a
              href={buildWhatsAppApiOrderUrl(order, branding?.phone)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] font-bold text-white hover:bg-[#1eb854]"
            >
              <MessageCircle className="size-4" /> Buka di WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
