import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCustomers, useSetCustomerStatus } from "@/hooks/queries";
import type { CustomerRow, CustomerStatus } from "@/services/customers.service";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api/errors";
import { Check, Ban, RotateCcw, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pelanggan")({
  head: () => ({ meta: [{ title: "Pelanggan — Admin" }] }),
  component: AdminPelanggan,
});

const TABS: { key: CustomerStatus | "all"; label: string }[] = [
  { key: "pending", label: "Menunggu" },
  { key: "active", label: "Aktif" },
  { key: "disabled", label: "Diblokir" },
  { key: "all", label: "Semua" },
];

const STATUS_BADGE: Record<CustomerStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  disabled: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  pending: "Menunggu",
  active: "Aktif",
  disabled: "Diblokir",
};

function AdminPelanggan() {
  const [tab, setTab] = useState<CustomerStatus | "all">("pending");
  const { data, isLoading } = useCustomers(tab === "all" ? {} : { status: tab });
  const list = data ?? [];
  const setStatus = useSetCustomerStatus();

  const act = async (c: CustomerRow, status: "active" | "disabled") => {
    try {
      await setStatus.mutateAsync({ id: c.id, status });
      toast.success(status === "active" ? "Pelanggan disetujui" : "Pelanggan diblokir");
    } catch (e) {
      toast.error(`Gagal: ${e instanceof ApiError ? e.message : "coba lagi"}`);
    }
  };

  const waLink = (c: CustomerRow) => {
    const num = (c.phone ?? "").replace(/\D/g, "").replace(/^0/, "62");
    return num ? `https://wa.me/${num}` : undefined;
  };

  return (
    <AdminShell title="Manajemen Pelanggan">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-bold ${
              tab === t.key ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Nama</th>
              <th className="px-4 py-3 font-bold">Kontak</th>
              <th className="px-4 py-3 font-bold">Daftar</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </td>
                <td className="px-4 py-3">
                  {c.phone ? (
                    waLink(c) ? (
                      <a href={waLink(c)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <MessageCircle className="size-3.5" /> {c.phone}
                      </a>
                    ) : c.phone
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${STATUS_BADGE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {c.status !== "active" && (
                      <button
                        onClick={() => act(c, "active")}
                        disabled={setStatus.isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {c.status === "disabled" ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
                        {c.status === "disabled" ? "Aktifkan" : "Setujui"}
                      </button>
                    )}
                    {c.status !== "disabled" && (
                      <button
                        onClick={() => act(c, "disabled")}
                        disabled={setStatus.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Ban className="size-3.5" /> Blokir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Memuat pelanggan…</td></tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Tidak ada pelanggan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
