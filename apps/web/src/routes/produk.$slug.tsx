import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { productsService } from "@/services/products.service";
import { ApiError } from "@/lib/api/errors";
import { useCategories } from "@/hooks/queries";
import type { Product } from "@/mock/types";
import { useCart } from "@/store/cart";
import { rupiah } from "@/lib/format";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart, Truck, ShieldCheck, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/produk/$slug")({
  loader: async ({ params }) => {
    try {
      const product = await productsService.getBySlug(params.slug);
      return { product };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) throw notFound();
      throw err;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name ?? "Produk"} — upstok` },
      { name: "description", content: loaderData?.product.description },
      { property: "og:image", content: loaderData?.product.images[0] },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col"><SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Produk tidak ditemukan</h1>
        <Link to="/produk" search={{ kategori: undefined as string | undefined }} className="mt-4 inline-block text-primary underline">Kembali ke katalog</Link>
      </div>
      <SiteFooter />
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData() as { product: Product };
  const { data: categories = [] } = useCategories();
  const cat = categories.find((c) => c.id === product.categoryId);
  const navigate = useNavigate();
  const add = useCart((s) => s.add);

  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const addToCart = (goToCart = false) => {
    add({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      price: product.price,
      qty,
      size,
      color,
    });
    toast.success(`${qty} pasang ${product.name} ditambahkan`);
    if (goToCart) navigate({ to: "/keranjang" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-4 text-xs text-muted-foreground">
          Beranda / {cat && (
            <Link to="/produk" search={{ kategori: cat.slug }} className="hover:text-primary">{cat.name}</Link>
          )} / <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-xl border border-border bg-secondary/30">
              <img
                src={product.images[activeImg]}
                alt={product.name}
                width={800}
                height={800}
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`size-20 overflow-hidden rounded-md border-2 ${activeImg === i ? "border-primary" : "border-border"}`}
                >
                  <img src={img} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-xs text-muted-foreground">SKU: {product.sku}</p>
            <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-brand">{rupiah(product.price)}</span>
              <span className="text-sm text-muted-foreground">/ pasang</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Stok {product.stock} pasang
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

            <div className="mt-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Ukuran</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`min-w-[3rem] rounded-md border px-3 py-2 text-sm font-medium ${
                      size === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Warna</div>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      color === c ? "border-primary bg-primary/5 text-primary font-bold" : "border-border hover:border-primary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="inline-flex items-center rounded-md border border-border">
                <button className="grid size-10 place-items-center hover:bg-secondary" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="size-4" /></button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="h-10 w-16 border-x border-border bg-transparent text-center text-sm font-bold outline-none"
                />
                <button className="grid size-10 place-items-center hover:bg-secondary" onClick={() => setQty(qty + 1)}><Plus className="size-4" /></button>
              </div>
              <div className="text-sm text-muted-foreground">
                Subtotal: <span className="font-bold text-foreground">{rupiah(product.price * qty)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => addToCart(false)}
                className="inline-flex h-12 items-center gap-2 rounded-md border-2 border-primary px-6 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <ShoppingCart className="size-4" /> Tambah ke Keranjang
              </button>
              <button
                onClick={() => addToCart(true)}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-sm font-bold text-brand-foreground hover:bg-brand-dark"
              >
                Beli Sekarang
              </button>
              <a
                href={`https://wa.me/6282276441753?text=${encodeURIComponent(`Halo Admin, saya tertarik dengan ${product.name} (${product.sku}). Bisa info stok dan harga grosirnya?`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-6 text-sm font-bold hover:bg-secondary"
              >
                <MessageCircle className="size-4" /> Tanya Stok
              </a>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 rounded-lg border border-border bg-secondary/30 p-4 text-xs">
              <div className="flex items-center gap-2"><Truck className="size-4 text-primary" /> Kirim seluruh Indonesia</div>
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Garansi tukar barang cacat</div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
