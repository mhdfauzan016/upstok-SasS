import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useCart } from "@/store/cart";
import { useCreateOrder } from "@/hooks/queries";
import { rupiah } from "@/lib/format";
import { buildWhatsAppApiOrderUrl } from "@/lib/whatsapp";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — upstok" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const clear = useCart((s) => s.clear);
  const createOrder = useCreateOrder();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const submitting = createOrder.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    if (!form.name || !form.phone || !form.address) {
      toast.error("Mohon lengkapi data");
      return;
    }
    createOrder.mutate(
      {
        customer: {
          name: form.name,
          phone: form.phone,
          address: form.address,
          notes: form.notes || undefined,
        },
        items: items.map((it) => ({ productId: it.productId, quantity: it.qty })),
      },
      {
        onSuccess: (order) => {
          const url = buildWhatsAppApiOrderUrl(order);
          clear();
          toast.success("Order tersimpan! Membuka WhatsApp...");
          setTimeout(() => {
            window.open(url, "_blank");
            navigate({ to: "/" });
          }, 600);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "INSUFFICIENT_STOCK") {
            toast.error("Stok tidak mencukupi untuk salah satu produk");
          } else {
            toast.error("Gagal menyimpan pesanan, coba lagi");
          }
        },
      },
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col"><SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Keranjang kosong</h1>
          <Link to="/produk" search={{ kategori: undefined as string | undefined }} className="mt-4 inline-block text-primary underline">Pilih produk dulu</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-extrabold md:text-3xl">Checkout</h1>

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-bold">Informasi Pemesan</h3>
              <div className="space-y-4">
                <Field label="Nama Lengkap / Nama Toko *" >
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input" placeholder="Toko Jaya Makmur" />
                </Field>
                <Field label="Nomor WhatsApp *">
                  <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input" placeholder="08xxxxxxxxxx" />
                </Field>
                <Field label="Alamat Lengkap *">
                  <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="input min-h-[88px]" placeholder="Jl. Contoh No. 12, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi" />
                </Field>
                <Field label="Catatan (opsional)">
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="input min-h-[64px]" placeholder="Permintaan khusus, jam kirim, dll." />
                </Field>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-bold">Produk yang Dipesan</h3>
              <div className="divide-y divide-border">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <img src={it.image} alt="" className="size-14 rounded object-cover" loading="lazy" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.size && `Uk ${it.size}`}{it.size && it.color && " • "}{it.color} • {it.qty} pasang
                      </div>
                    </div>
                    <div className="text-sm font-bold">{rupiah(it.price * it.qty)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6 lg:sticky lg:top-32">
            <h3 className="font-bold">Ringkasan</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Item</span><span>{items.reduce((s, i) => s + i.qty, 0)} pasang</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{rupiah(total)}</span></div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-extrabold text-brand">{rupiah(total)}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 font-bold text-white hover:bg-[#1eb854] disabled:opacity-60"
            >
              <MessageCircle className="size-4" />
              {submitting ? "Memproses..." : "Pesan via WhatsApp"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Setelah klik, order tersimpan & WhatsApp admin terbuka otomatis untuk konfirmasi.
            </p>
          </aside>
        </form>
      </div>
      <SiteFooter />

      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
