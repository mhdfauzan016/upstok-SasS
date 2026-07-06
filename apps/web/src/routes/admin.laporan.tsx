import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useReportSummary } from "@/hooks/queries";
import { productsService } from "@/services/products.service";
import { ordersService } from "@/services/orders.service";
import { inventoryService } from "@/services/inventory.service";
import { rupiah } from "@/lib/format";
import type { ApiOrderStatus } from "@/lib/api/types";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  FileDown, FileSpreadsheet, TrendingUp, ShoppingBag, Wallet, Boxes, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/laporan")({
  head: () => ({ meta: [{ title: "Laporan — Admin" }] }),
  component: AdminLaporan,
});

const STATUS_LABEL: Record<ApiOrderStatus, string> = {
  pending: "Pending",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function AdminLaporan() {
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const summary = useReportSummary({
    from: range.from || undefined,
    to: range.to || undefined,
  });
  const s = summary.data;

  const monthLabel = (m: string) => {
    const [y, mm] = m.split("-");
    return new Date(Number(y), Number(mm) - 1, 1).toLocaleString("id-ID", { month: "short" });
  };
  const money = (minor: number) => rupiah(Math.round(minor / 100));

  const exportTo = async (
    kind: "produk" | "pesanan" | "inventori",
    format: "xlsx" | "csv",
  ) => {
    try {
      let rows: Record<string, unknown>[] = [];
      if (kind === "produk") {
        const res = await productsService.list({ limit: 1000 });
        rows = res.items.map((p) => ({
          SKU: p.sku, Nama: p.name, Harga: p.price, Stok: p.stock,
          Ukuran: p.sizes.join("|"), Warna: p.colors.join("|"),
        }));
      } else if (kind === "pesanan") {
        const res = await ordersService.list({ limit: 1000 });
        rows = res.items.map((o) => ({
          "No. Pesanan": o.orderNumber, Tanggal: o.createdAt, Customer: o.customer.name,
          HP: o.customer.phone, Total: o.total.amount / 100, Status: STATUS_LABEL[o.status], Items: o.itemCount,
        }));
      } else {
        const res = await inventoryService.list({ limit: 1000 });
        rows = res.items.map((i) => ({
          SKU: i.sku, Produk: i.productName, "On Hand": i.quantityOnHand,
          Tersedia: i.quantityAvailable, "Min Stok": i.lowStockThreshold,
        }));
      }
      if (rows.length === 0) {
        toast.error("Tidak ada data untuk diekspor");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${kind}.${format}`, { bookType: format });
      toast.success(`File ${kind}.${format} terunduh`);
    } catch {
      toast.error("Gagal mengekspor data");
    }
  };

  return (
    <AdminShell title="Laporan & Insight">
      {/* date range */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Dari</span>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Sampai</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
        </label>
        {(range.from || range.to) && (
          <button onClick={() => setRange({ from: "", to: "" })} className="h-10 rounded-md border border-border px-3 text-sm hover:bg-secondary">
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {range.from || range.to ? "Rentang khusus" : "Default: 6 bulan terakhir"}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Wallet} label="Pendapatan" value={s ? money(s.revenue.total) : "—"} sub={`${s?.revenue.orderCount ?? 0} pesanan`} />
        <KPI icon={TrendingUp} label="Rata-rata Order (AOV)" value={s ? money(s.revenue.avgOrderValue) : "—"} sub="per pesanan" />
        <KPI icon={Boxes} label="Nilai Stok" value={s ? money(s.inventory.stockValuation) : "—"} sub={`${s?.inventory.totalOnHand ?? 0} unit on-hand`} />
        <KPI icon={AlertTriangle} label="Stok Menipis / Habis" value={s ? `${s.inventory.lowStockCount} / ${s.inventory.outOfStockCount}` : "—"} sub={`dari ${s?.inventory.productCount ?? 0} produk`} />
      </div>

      {/* charts */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Pendapatan per Bulan">
          <div className="h-64">
            {s && s.revenueByMonth.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={s.revenueByMonth.map((m) => ({ month: monthLabel(m.month), revenue: Math.round(m.revenue / 100) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} width={70} tickFormatter={(v) => `${(v / 1000).toLocaleString("id-ID")}k`} />
                  <Tooltip formatter={(v: number) => rupiah(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty loading={summary.isLoading} />}
          </div>
        </Panel>

        <Panel title="Produk Terlaris (qty)">
          <div className="h-64">
            {s && s.topProducts.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={s.topProducts.slice(0, 6).map((p) => ({ name: p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name, qty: p.quantity }))} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={130} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="qty" fill="var(--color-brand)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty loading={summary.isLoading} label="Belum ada penjualan produk" />}
          </div>
        </Panel>
      </div>

      {/* orders by status + top products table */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Pesanan per Status">
          <div className="space-y-2">
            {s && s.ordersByStatus.length > 0 ? s.ordersByStatus.map((r) => (
              <div key={r.status} className="flex items-center justify-between text-sm">
                <span>{STATUS_LABEL[r.status]}</span>
                <span className="text-muted-foreground">{r.count} pesanan · <span className="font-medium text-foreground">{money(r.revenue)}</span></span>
              </div>
            )) : <Empty loading={summary.isLoading} label="Belum ada pesanan" />}
          </div>
        </Panel>

        <Panel title="Top Produk (pendapatan)">
          <div className="space-y-2">
            {s && s.topProducts.length > 0 ? s.topProducts.slice(0, 5).map((p) => (
              <div key={p.productId} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{p.name}</span>
                <span className="shrink-0 text-muted-foreground">{p.quantity} pcs · <span className="font-medium text-foreground">{money(p.revenue)}</span></span>
              </div>
            )) : <Empty loading={summary.isLoading} label="Belum ada penjualan" />}
          </div>
        </Panel>
      </div>

      {/* exports */}
      <h3 className="mb-3 mt-8 text-sm font-bold">Export Data</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {([
          { title: "Data Produk", desc: "Katalog + stok saat ini", kind: "produk" as const, icon: ShoppingBag },
          { title: "Data Pesanan", desc: "Seluruh pesanan tercatat", kind: "pesanan" as const, icon: ShoppingBag },
          { title: "Data Inventori", desc: "Stok per produk", kind: "inventori" as const, icon: Boxes },
        ]).map((r) => (
          <div key={r.kind} className="rounded-xl border border-border bg-card p-6">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileSpreadsheet className="size-5" /></div>
            <h3 className="mt-4 font-bold">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => exportTo(r.kind, "xlsx")} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90">
                <FileDown className="size-3.5" /> Excel
              </button>
              <button onClick={() => exportTo(r.kind, "csv")} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-xs font-bold hover:bg-secondary">
                <FileDown className="size-3.5" /> CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function KPI({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></div>
        <span className="text-[10px] font-medium uppercase text-muted-foreground">{sub}</span>
      </div>
      <div className="mt-4 text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ loading, label = "Belum ada data" }: { loading: boolean; label?: string }) {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">{loading ? "Memuat…" : label}</div>;
}
