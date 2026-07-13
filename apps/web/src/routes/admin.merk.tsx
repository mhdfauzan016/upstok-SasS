import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { BrandOption } from "@/services/brands.service";
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
} from "@/hooks/queries";
import { ApiError } from "@/lib/api/errors";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/merk")({
  head: () => ({ meta: [{ title: "Merk — Admin" }] }),
  component: AdminMerk,
});

function AdminMerk() {
  const [editing, setEditing] = useState<BrandOption | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useBrands();
  const list = data ?? [];
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const errMsg = (e: unknown) => {
    if (!(e instanceof ApiError)) return "Terjadi kesalahan";
    const details = e.details as
      | { constraints?: Record<string, string> }[]
      | undefined;
    if (Array.isArray(details) && details.length > 0) {
      const msgs = details
        .map((d) => (d.constraints ? Object.values(d.constraints)[0] : null))
        .filter(Boolean);
      if (msgs.length > 0) return msgs.join("; ");
    }
    return e.message;
  };

  /** Returns a slug error string on failure, or null on success. */
  const onSave = async (input: { name: string; slug?: string }): Promise<string | null> => {
    try {
      if (editing) {
        await updateBrand.mutateAsync({ id: editing.id, input });
      } else {
        await createBrand.mutateAsync(input);
      }
      setEditing(null);
      setCreating(false);
      toast.success("Merk tersimpan");
      return null;
    } catch (e) {
      toast.error(`Gagal menyimpan: ${errMsg(e)}`);
      return errMsg(e);
    }
  };

  const onDelete = async (b: BrandOption) => {
    if (b.productCount > 0 && !confirm(`Merk "${b.name}" punya ${b.productCount} produk. Produk akan dilepas dari merk. Lanjut hapus?`)) return;
    if (b.productCount === 0 && !confirm("Hapus merk?")) return;
    try {
      await deleteBrand.mutateAsync(b.id);
      toast.success("Merk dihapus");
    } catch (e) {
      toast.error(`Gagal menghapus: ${errMsg(e)}`);
    }
  };

  return (
    <AdminShell title="Manajemen Merk">
      <div className="mb-4 flex justify-end">
        <button onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4" /> Tambah Merk
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">Memuat merk…</div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">Belum ada merk.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{b.name}</h3>
                  <p className="text-xs text-muted-foreground">/{b.slug}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(b)} className="grid size-8 place-items-center rounded hover:bg-secondary"><Pencil className="size-4" /></button>
                  <button onClick={() => onDelete(b)} className="grid size-8 place-items-center rounded hover:bg-destructive/10"><Trash2 className="size-4 text-destructive" /></button>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                {b.productCount} produk
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <BrandDialog
          brand={editing}
          saving={createBrand.isPending || updateBrand.isPending}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={onSave}
        />
      )}
    </AdminShell>
  );
}

function BrandDialog({ brand, saving, onClose, onSave }: { brand: BrandOption | null; saving: boolean; onClose: () => void; onSave: (input: { name: string; slug?: string }) => Promise<string | null> }) {
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Nama merk minimal 2 karakter");
      return;
    }
    if (slug.trim() && !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug.trim())) {
      setError("Slug hanya boleh huruf kecil, angka, dan tanda hubung");
      return;
    }
    setError(null);
    const serverError = await onSave({ name: trimmed, slug: slug.trim() || undefined });
    if (serverError) setError(serverError);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">{brand ? "Edit Merk" : "Tambah Merk"}</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded hover:bg-secondary"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} noValidate className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Nama</span>
            <input value={name} onChange={(e) => { setName(e.target.value); setError(null); }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Slug (URL)</span>
            <input value={slug} onChange={(e) => { setSlug(e.target.value); setError(null); }}
              placeholder="otomatis dari nama"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono outline-none focus:border-primary" />
          </label>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-secondary">Batal</button>
            <button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
