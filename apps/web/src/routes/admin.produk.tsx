import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { rupiah } from "@/lib/format";
import type { Product } from "@/mock/types";
import { productsService } from "@/services/products.service";
import { inventoryService } from "@/services/inventory.service";
import type { CategoryOption } from "@/services/categories.service";
import { useQueryClient } from "@tanstack/react-query";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCategories,
} from "@/hooks/queries";
import { ApiError } from "@/lib/api/errors";
import { Loader2, Plus, Search, Pencil, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produk")({
  head: () => ({ meta: [{ title: "Produk — Admin" }] }),
  component: AdminProduk,
});

/** Inline validation messages keyed by form field. */
type FieldErrors = { name?: string; sku?: string; price?: string; images?: string };

function AdminProduk() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  // Category filter is applied server-side (?categoryId) so it works even
  // though list rows don't carry every field; search stays client-side.
  const { data, isLoading } = useProducts({ categoryId: cat || undefined });
  const products = data?.items ?? [];
  const { data: catData } = useCategories();
  const categories = catData ?? [];
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const qc = useQueryClient();

  const filtered = products.filter((p) => {
    if (q && !`${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const errMsg = (e: unknown) => {
    if (!(e instanceof ApiError)) return "Terjadi kesalahan";
    // Surface field-level validation failures (422) so the cause is obvious.
    const details = e.details as
      | { field?: string; constraints?: Record<string, string> }[]
      | undefined;
    if (Array.isArray(details) && details.length > 0) {
      const msgs = details
        .map((d) => (d.constraints ? Object.values(d.constraints)[0] : d.field))
        .filter(Boolean);
      if (msgs.length > 0) return msgs.join("; ");
    }
    return e.message;
  };

  /**
   * Maps a server error to inline field errors keyed by the form's field names.
   * Covers 422 validation details and CONFLICT (duplicate sku/slug).
   */
  const fieldErrorsOf = (e: unknown): FieldErrors => {
    if (!(e instanceof ApiError)) return {};
    const out: FieldErrors = {};
    const details = e.details as
      | { field?: string; constraints?: Record<string, string> }[]
      | undefined;
    if (Array.isArray(details)) {
      for (const d of details) {
        const msg = d.constraints
          ? Object.values(d.constraints)[0]
          : "Nilai tidak valid";
        if (d.field === "name") out.name = msg;
        else if (d.field === "sku") out.sku = msg;
        else if (d.field === "price") out.price = msg;
        else if (d.field === "images") out.images = "Ada gambar yang tidak valid. Coba unggah ulang.";
      }
    }
    if (e.code === "CONFLICT") {
      const sku = (e.details as { sku?: string } | undefined)?.sku;
      if (sku) out.sku = "SKU sudah dipakai produk lain";
    }
    return out;
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Produk dihapus");
    } catch (e) {
      toast.error(`Gagal menghapus: ${errMsg(e)}`);
    }
  };

  /** Returns server field errors on failure, or null on success. */
  const onSave = async (p: Product): Promise<FieldErrors | null> => {
    const input = {
      name: p.name.trim(),
      sku: p.sku.trim(),
      slug: p.slug || undefined,
      priceRupiah: p.price,
      description: p.description || undefined,
      // Only persist real uploaded URLs; drop the UI's local fallback asset
      // (a bundled relative path) which the API rejects as a non-URL.
      images: p.images.filter((u) => /^https?:\/\//i.test(u)),
      colors: p.colors.map((c) => c.trim()).filter(Boolean),
      sizes: p.sizes.map((s) => s.trim()).filter(Boolean),
      categoryId: p.categoryId || undefined,
    };
    try {
      // 1. Save the product record (name, sku, price, images, colors, ...).
      const saved = editing
        ? await updateProduct.mutateAsync({ id: p.id, input })
        : await createProduct.mutateAsync(input);

      // 2. Stock lives in the Inventory module, so sync it via a stock delta.
      const currentStock = editing ? editing.stock ?? 0 : 0;
      const delta = p.stock - currentStock;
      let stockOk = true;
      if (delta !== 0) {
        try {
          await inventoryService.adjust({
            productId: saved.id,
            quantityChange: delta,
            type: delta > 0 ? "restock" : "adjustment",
            note: "Disetel dari form produk",
          });
          qc.invalidateQueries({ queryKey: ["products"] });
          qc.invalidateQueries({ queryKey: ["inventory"] });
        } catch {
          stockOk = false;
        }
      }

      setEditing(null);
      setCreating(false);
      if (stockOk) toast.success("Produk tersimpan");
      else toast.error("Produk tersimpan, tetapi stok gagal diperbarui.");
      return null;
    } catch (e) {
      toast.error(`Gagal menyimpan: ${errMsg(e)}`);
      return fieldErrorsOf(e);
    }
  };

  return (
    <AdminShell title="Manajemen Produk">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / SKU..."
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" /> Tambah Produk
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Produk</th>
                <th className="px-4 py-3 font-bold">SKU</th>
                <th className="px-4 py-3 font-bold">Kategori</th>
                <th className="px-4 py-3 font-bold text-right">Harga</th>
                <th className="px-4 py-3 font-bold text-right">Stok</th>
                <th className="px-4 py-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images[0] ?? "/placeholder.svg"} alt="" className="size-10 rounded object-cover" />
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.colors.length} warna • {p.sizes.length} ukuran</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-muted-foreground">{categories.find((c) => c.id === p.categoryId)?.name}</td>
                  <td className="px-4 py-3 text-right font-bold text-brand">{rupiah(p.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${p.stock < 200 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(p)} className="grid size-8 place-items-center rounded hover:bg-secondary" title="Edit">
                        <Pencil className="size-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => onDelete(p.id)} className="grid size-8 place-items-center rounded hover:bg-destructive/10" title="Hapus">
                        <Trash2 className="size-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Memuat produk…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Tidak ada produk</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          Menampilkan {filtered.length} dari {products.length} produk
        </div>
      </div>

      {(editing || creating) && (
        <ProductDialog
          product={editing}
          categories={categories}
          saving={createProduct.isPending || updateProduct.isPending}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={onSave}
        />
      )}
    </AdminShell>
  );
}

function ProductDialog({ product, categories, saving, onClose, onSave }: { product: Product | null; categories: CategoryOption[]; saving: boolean; onClose: () => void; onSave: (p: Product) => Promise<FieldErrors | null> }) {
  const empty: Product = {
    id: `p${Date.now()}`, slug: "", name: "", sku: "", categoryId: "",
    price: 0, stock: 0, description: "",
    sizes: [], colors: [],
    images: [],
  };
  const [form, setForm] = useState<Product>(product ?? empty);
  // Harga/Stok are edited as strings so the field can be fully cleared
  // (an empty string, not a stuck "0"); we parse back to a number on change.
  const [priceStr, setPriceStr] = useState(product ? String(product.price) : "");
  const [stockStr, setStockStr] = useState(product ? String(product.stock) : "");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const fileInput = useRef<HTMLInputElement>(null);

  /** Client-side checks mirroring the API's DTO rules. */
  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    const name = form.name.trim();
    if (name.length < 2) e.name = "Nama produk minimal 2 karakter";
    else if (name.length > 150) e.name = "Nama produk maksimal 150 karakter";

    const sku = form.sku.trim();
    if (!sku) e.sku = "SKU wajib diisi";
    else if (sku.length > 64) e.sku = "SKU maksimal 64 karakter";

    if (priceStr.trim() === "") e.price = "Harga wajib diisi";
    else if (Number(priceStr) <= 0) e.price = "Harga harus lebih dari 0";

    return e;
  };

  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    const serverErrors = await onSave(form);
    if (serverErrors) setErrors(serverErrors);
  };

  const onPickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map((f) => productsService.uploadImage(f)),
      );
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      toast.success(urls.length > 1 ? `${urls.length} gambar diunggah` : "Gambar diunggah");
    } catch {
      toast.error("Gagal mengunggah gambar. Pastikan Anda sudah login.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeImage = (idx: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  /** Accept only digits (or empty); keep the raw string and sync a numeric value. */
  const onNumericChange =
    (setStr: (v: string) => void, key: "price" | "stock") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw !== "" && !/^\d+$/.test(raw)) return; // reject non-digits
      setStr(raw);
      setForm((f) => ({ ...f, [key]: raw === "" ? 0 : Number(raw) }));
    };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="font-bold">{product ? "Edit Produk" : "Tambah Produk"}</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded hover:bg-secondary"><X className="size-4" /></button>
        </div>
        <form
          onSubmit={submit}
          noValidate
          className="space-y-4 p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Produk *" error={errors.name}><input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); clearError("name"); }} className={`input ${errors.name ? "input-error" : ""}`} /></Field>
            <Field label="SKU *" error={errors.sku}><input value={form.sku} onChange={(e) => { setForm({ ...form, sku: e.target.value }); clearError("sku"); }} className={`input ${errors.sku ? "input-error" : ""}`} /></Field>
            <Field label="Kategori"><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input"><option value="">Tanpa Kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Harga (Rp) *" error={errors.price}><input type="text" inputMode="numeric" value={priceStr} onChange={(e) => { onNumericChange(setPriceStr, "price")(e); clearError("price"); }} placeholder="0" className={`input ${errors.price ? "input-error" : ""}`} /></Field>
            <Field label="Stok"><input type="text" inputMode="numeric" value={stockStr} onChange={onNumericChange(setStockStr, "stock")} placeholder="0" className="input" /></Field>
            <Field label="Ukuran (pisah koma)"><input value={form.sizes.join(",")} onChange={(e) => setForm({ ...form, sizes: e.target.value.split(",").map((s) => s.trim()) })} className="input" /></Field>
            <Field label="Warna (pisah koma)" className="sm:col-span-2"><input value={form.colors.join(",")} onChange={(e) => setForm({ ...form, colors: e.target.value.split(",").map((s) => s.trim()) })} className="input" /></Field>
            <Field label="Deskripsi" className="sm:col-span-2"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[80px]" /></Field>
          </div>
          <Field label="Gambar Produk" error={errors.images}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {form.images.map((img, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded border border-border bg-secondary/30">
                  <img src={img} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Hapus gambar"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className="grid aspect-square place-items-center rounded border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                title="Unggah gambar"
              >
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => onPickImages(e.target.files)}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Format: JPG, PNG, WEBP, GIF • maks 5 MB per gambar.</p>
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary">Batal</button>
            <button disabled={saving || uploading} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-primary)}.input.input-error{border-color:var(--color-destructive)}.input.input-error:focus{border-color:var(--color-destructive)}`}</style>
    </div>
  );
}

function Field({ label, children, className = "", error }: { label: string; children: React.ReactNode; className?: string; error?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}
