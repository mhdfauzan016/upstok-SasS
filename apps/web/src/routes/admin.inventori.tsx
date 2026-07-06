import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  useAdjustStock,
  useInventory,
  useInventoryMovements,
  useLowStock,
  useUpdateThreshold,
} from "@/hooks/queries";
import { formatDateTime } from "@/lib/format";
import type { ApiMovementType } from "@/lib/api/types";
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/inventori")({
  head: () => ({ meta: [{ title: "Inventori — Admin" }] }),
  component: AdminInventori,
});

const MOVEMENT_LABEL: Record<ApiMovementType, string> = {
  restock: "Stok Masuk",
  return: "Retur",
  adjustment: "Penyesuaian",
  sale: "Penjualan",
};

function AdminInventori() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const inventory = useInventory({ search: q || undefined });
  const items = inventory.data?.items ?? [];
  // Tenant-wide low-stock alerts (independent of the search filter / page).
  const lowStock = useLowStock().data ?? [];

  const adjust = useAdjustStock();
  const updateThreshold = useUpdateThreshold();

  const [form, setForm] = useState<{
    direction: "in" | "out";
    qty: number;
    note: string;
  }>({ direction: "in", qty: 0, note: "" });

  // Keep a valid selection as data loads.
  const activeId = selected ?? items[0]?.productId ?? null;
  const active = items.find((i) => i.productId === activeId) ?? null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!form.qty || form.qty <= 0) {
      toast.error("Qty harus lebih dari 0");
      return;
    }
    const quantityChange =
      form.direction === "in" ? form.qty : -form.qty;
    adjust.mutate(
      {
        productId: active.productId,
        quantityChange,
        type: form.direction === "in" ? "restock" : "adjustment",
        note: form.note || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            `Stok ${form.direction === "in" ? "masuk" : "keluar"} dicatat`,
          );
          setForm({ ...form, qty: 0, note: "" });
        },
        onError: () => toast.error("Gagal mencatat stok"),
      },
    );
  };

  return (
    <AdminShell title="Manajemen Inventori">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama / SKU..."
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Produk</th>
                    <th className="px-4 py-3 font-bold">SKU</th>
                    <th className="px-4 py-3 font-bold text-right">On Hand</th>
                    <th className="px-4 py-3 font-bold text-right">Tersedia</th>
                    <th className="px-4 py-3 font-bold text-right">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        Memuat...
                      </td>
                    </tr>
                  )}
                  {!inventory.isLoading &&
                    items.map((i) => (
                      <tr
                        key={i.productId}
                        onClick={() => setSelected(i.productId)}
                        className={`cursor-pointer border-t border-border hover:bg-secondary/30 ${
                          i.productId === activeId ? "bg-secondary/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3">{i.productName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{i.sku}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {i.quantityOnHand}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {i.quantityAvailable}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold ${
                              i.lowStock
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {i.lowStockThreshold}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {!inventory.isLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        Tidak ada produk
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {active && <MovementLedger productId={active.productId} />}
        </div>

        <div className="space-y-5">
          <form
            onSubmit={submit}
            className="space-y-3 rounded-xl border border-border bg-card p-5"
          >
            <h3 className="font-bold">Catat Stok</h3>
            <p className="text-xs text-muted-foreground">
              Produk:{" "}
              <span className="font-medium text-foreground">
                {active ? active.productName : "—"}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: "in" })}
                className={`h-10 rounded-md text-sm font-bold ${
                  form.direction === "in"
                    ? "bg-emerald-500 text-white"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                Stok Masuk
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: "out" })}
                className={`h-10 rounded-md text-sm font-bold ${
                  form.direction === "out"
                    ? "bg-rose-500 text-white"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                Stok Keluar
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Qty
              </span>
              <input
                type="number"
                min={1}
                value={form.qty || ""}
                onChange={(e) =>
                  setForm({ ...form, qty: Number(e.target.value) })
                }
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Catatan
              </span>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              disabled={!active || adjust.isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="size-4" /> {adjust.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </form>

          {active && (
            <ThresholdForm
              productId={active.productId}
              current={active.lowStockThreshold}
              onSave={(v) =>
                updateThreshold.mutate(
                  { productId: active.productId, lowStockThreshold: v },
                  {
                    onSuccess: () => toast.success("Batas minimum diperbarui"),
                    onError: () => toast.error("Gagal memperbarui batas"),
                  },
                )
              }
              pending={updateThreshold.isPending}
            />
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="mb-3 inline-flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="size-4" /> Peringatan Stok Menipis
            </h3>
            <div className="space-y-2">
              {lowStock.length === 0 && (
                <p className="text-sm text-amber-700">Semua stok aman ✓</p>
              )}
              {lowStock.map((p) => (
                <div
                  key={p.productId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-amber-900">{p.productName}</span>
                  <span className="ml-2 font-bold text-amber-700">
                    {p.quantityOnHand}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function ThresholdForm({
  productId,
  current,
  onSave,
  pending,
}: {
  productId: string;
  current: number;
  onSave: (v: number) => void;
  pending: boolean;
}) {
  // Re-seed local state when the selected product changes. String-backed so the
  // field can be fully cleared with backspace (not stuck at "0").
  const [value, setValue] = useState(String(current));
  const [seededFor, setSeededFor] = useState(productId);
  if (seededFor !== productId) {
    setSeededFor(productId);
    setValue(String(current));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Batas Stok Minimum</h3>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || /^\d+$/.test(raw)) setValue(raw);
        }}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => onSave(value === "" ? 0 : Number(value))}
        className="h-10 w-full rounded-md border border-border text-sm font-bold hover:bg-secondary disabled:opacity-50"
      >
        Simpan Batas
      </button>
    </div>
  );
}

function MovementLedger({ productId }: { productId: string }) {
  const { data, isLoading } = useInventoryMovements(productId);
  const rows = data?.data ?? [];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-sm font-bold">
        Riwayat Pergerakan
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Waktu</th>
              <th className="px-4 py-3 font-bold">Tipe</th>
              <th className="px-4 py-3 font-bold text-right">Perubahan</th>
              <th className="px-4 py-3 font-bold text-right">Saldo</th>
              <th className="px-4 py-3 font-bold">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Memuat...
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs">{MOVEMENT_LABEL[m.type]}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        m.quantityChange >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {m.quantityChange >= 0 ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUp className="size-3" />
                      )}
                      {Math.abs(m.quantityChange)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{m.quantityAfter}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.note ?? "—"}
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada riwayat
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
