import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  useProducts,
  useInventory,
  useLowStock,
  useAdminOrders,
} from "@/hooks/queries";
import { rupiah, formatDateTime } from "@/lib/format";
import type { ApiOrderStatus } from "@/lib/api/types";
import { Package, Warehouse, ShoppingBag, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin" }] }),
  component: AdminDashboard,
});

const STATUS: Record<ApiOrderStatus, { label: string; badge: string }> = {
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-700" },
  processing: { label: "Diproses", badge: "bg-blue-100 text-blue-700" },
  shipped: { label: "Dikirim", badge: "bg-purple-100 text-purple-700" },
  completed: { label: "Selesai", badge: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Dibatalkan", badge: "bg-rose-100 text-rose-700" },
};

const STATUS_ORDER: ApiOrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

function AdminDashboard() {
  const productsQuery = useProducts({});
  const inventory = useInventory({});
  const lowStockQuery = useLowStock();
  const ordersQuery = useAdminOrders({});

  const orders = ordersQuery.data?.items ?? [];
  const stockItems = inventory.data?.items ?? [];
  const lowStock = lowStockQuery.data ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const ordersToday = orders.filter((o) => o.createdAt.startsWith(today)).length;
  const ordersThisMonth = orders.filter((o) => o.createdAt.startsWith(thisMonth)).length;

  const totalProducts = productsQuery.data?.total ?? 0;
  const totalStock = stockItems.reduce((s, i) => s + i.quantityOnHand, 0);
  const recent = orders.slice(0, 5);

  // Monthly order/revenue trend derived from the loaded orders (last 6 months).
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: d.toLocaleString("id-ID", { month: "short" }),
      orders: 0,
      revenue: 0,
    };
  });
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
  orders.forEach((o) => {
    const i = bucketIndex.get(o.createdAt.slice(0, 7));
    if (i !== undefined) {
      buckets[i].orders += 1;
      buckets[i].revenue += o.total.amount / 100;
    }
  });

  // Orders grouped by status (derivable from the list; top-products needs
  // line items the list endpoint doesn't return).
  const byStatus = STATUS_ORDER.map((s) => ({
    name: STATUS[s].label,
    count: orders.filter((o) => o.status === s).length,
  })).filter((s) => s.count > 0);

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold">Selamat datang kembali, Admin 👋</h2>
          <p className="text-sm text-muted-foreground">Berikut ringkasan toko Anda hari ini.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI icon={Package} label="Total Produk" value={totalProducts.toLocaleString("id-ID")} delta="produk aktif" tone="primary" />
          <KPI icon={Warehouse} label="Total Stok" value={totalStock.toLocaleString("id-ID")} delta="unit on-hand" tone="brand" />
          <KPI icon={ShoppingBag} label="Pesanan Hari Ini" value={ordersToday.toString()} delta={`${orders.length} total`} tone="primary" />
          <KPI icon={TrendingUp} label="Pesanan Bulan Ini" value={ordersThisMonth.toString()} delta="bulan berjalan" tone="brand" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Tren Pesanan 6 Bulan Terakhir">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="orders" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Pesanan per Status">
            <div className="h-64">
              {byStatus.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">Belum ada pesanan</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={byStatus} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={90} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="var(--color-brand)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Pesanan Terbaru" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">No. Pesanan</th>
                    <th className="py-2 pr-3 font-medium">Customer</th>
                    <th className="py-2 pr-3 font-medium">Tanggal</th>
                    <th className="py-2 pr-3 font-medium">Total</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.isLoading && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Memuat…</td></tr>
                  )}
                  {!ordersQuery.isLoading && recent.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada pesanan</td></tr>
                  )}
                  {recent.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-[11px]">{o.orderNumber}</td>
                      <td className="py-2.5 pr-3">{o.customer.name}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{formatDateTime(o.createdAt)}</td>
                      <td className="py-2.5 pr-3 font-bold text-brand">{rupiah(o.total.amount / 100)}</td>
                      <td className="py-2.5">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${STATUS[o.status].badge}`}>
                          {STATUS[o.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/admin/pesanan" className="mt-3 inline-block text-xs font-bold text-primary hover:underline">Lihat semua pesanan →</Link>
          </Panel>

          <Panel title="Stok Menipis">
            <div className="space-y-3">
              {lowStockQuery.isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
              {!lowStockQuery.isLoading && lowStock.length === 0 && <p className="text-sm text-muted-foreground">Semua stok aman ✓</p>}
              {lowStock.map((p) => (
                <div key={p.productId} className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-2.5">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.productName}</div>
                    <div className="text-xs text-amber-700 font-bold">{p.quantityOnHand} tersisa (min {p.lowStockThreshold})</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}

function KPI({ icon: Icon, label, value, delta, tone }: { icon: any; label: string; value: string; delta: string; tone: "primary" | "brand" }) {
  const cls = tone === "primary" ? "bg-primary/10 text-primary" : "bg-brand/10 text-brand";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className={`grid size-10 place-items-center rounded-lg ${cls}`}><Icon className="size-5" /></div>
        <span className="text-[10px] font-medium uppercase text-muted-foreground">{delta}</span>
      </div>
      <div className="mt-4 text-3xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <h3 className="mb-4 text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}
