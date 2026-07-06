import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useCart } from "@/store/cart";
import { rupiah } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/keranjang")({
  head: () => ({ meta: [{ title: "Keranjang — Sandalia Grosir" }] }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = useCart((s) => s.total());

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-extrabold md:text-3xl">Keranjang Belanja</h1>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-16 text-center">
            <ShoppingBag className="mx-auto size-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Keranjang Anda masih kosong.</p>
            <Link
              to="/produk"
              search={{ kategori: undefined as string | undefined }}
              className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                  <img src={it.image} alt={it.name} loading="lazy" className="size-24 rounded-md object-cover" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold truncate">{it.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {it.size && `Ukuran ${it.size}`}{it.size && it.color && " • "}{it.color}
                        </p>
                        <p className="mt-1 text-brand font-extrabold">{rupiah(it.price)}</p>
                      </div>
                      <button
                        onClick={() => remove(it.productId, it.size, it.color)}
                        className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Hapus"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-end justify-between">
                      <div className="inline-flex items-center rounded-md border border-border">
                        <button className="grid size-8 place-items-center hover:bg-secondary" onClick={() => setQty(it.productId, it.qty - 1, it.size, it.color)}><Minus className="size-3" /></button>
                        <span className="w-10 text-center text-sm font-bold">{it.qty}</span>
                        <button className="grid size-8 place-items-center hover:bg-secondary" onClick={() => setQty(it.productId, it.qty + 1, it.size, it.color)}><Plus className="size-3" /></button>
                      </div>
                      <div className="text-sm">
                        Subtotal: <span className="font-bold">{rupiah(it.price * it.qty)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-bold">Ringkasan Order</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Item</span>
                  <span>{items.reduce((s, i) => s + i.qty, 0)} pasang</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Ongkos Kirim</span>
                  <span>Dihitung saat WhatsApp</span>
                </div>
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-2xl font-extrabold text-brand">{rupiah(total)}</span>
              </div>
              <Link
                to="/checkout"
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
              >
                Lanjut ke Checkout
              </Link>
              <Link
                to="/produk"
                search={{ kategori: undefined as string | undefined }}
                className="mt-2 block text-center text-xs text-muted-foreground hover:text-primary"
              >
                ← Lanjut belanja
              </Link>
            </aside>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
