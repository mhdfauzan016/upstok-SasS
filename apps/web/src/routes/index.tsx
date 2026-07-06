import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProductCard } from "@/components/site/ProductCard";
import { useProducts, useCategories, useBranding } from "@/hooks/queries";
import { ArrowRight, Truck, Tag, Package, ShieldCheck } from "lucide-react";
import heroImg from "@/assets/hero-sandals.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sandalia Grosir — Pusat Sandal Wholesale Indonesia" },
      { name: "description", content: "Distributor sandal grosir terpercaya. Harga pabrik, stok ribuan kodi, kirim seluruh Indonesia via WhatsApp." },
      { property: "og:title", content: "Sandalia Grosir — Pusat Sandal Wholesale Indonesia" },
      { property: "og:description", content: "Distributor sandal grosir terpercaya. Harga pabrik, stok ribuan kodi, kirim seluruh Indonesia." },
    ],
  }),
  component: Index,
});

function Index() {
  // Live storefront data for the resolved tenant. The API has no "featured" /
  // "bestSeller" flags, so we surface the latest active products instead.
  // High limit so the "Pasang Ready" total covers all active products, not just
  // the first page. The public products list carries each product's stock.
  const { data: productData } = useProducts({ limit: 1000 });
  const products = productData?.items ?? [];
  const { data: categories = [] } = useCategories();
  const { data: branding } = useBranding();

  const featured = products.slice(0, 8);
  const bestSellers = products.slice(8, 12);

  // Real figures from the tenant's own data (mirrors the admin dashboard).
  const storeName = branding?.name ?? "Toko";
  const totalProducts = productData?.total ?? 0;
  const totalCategories = categories.length;
  // Sum of on-hand stock across all active products in the catalog.
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const nf = (n: number) => n.toLocaleString("id-ID");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-brand/5">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              Distributor Sandal #1 di Indonesia
            </span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Grosir Sandal <span className="text-primary">Harga Pabrik</span>, Kirim ke{" "}
              <span className="text-brand">Seluruh Nusantara</span>.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              {totalProducts > 0
                ? `${nf(totalProducts)} model sandal grosir siap kirim ke seluruh Indonesia.`
                : "Sandal grosir siap kirim ke seluruh Indonesia."}{" "}
              Order mudah lewat WhatsApp, tanpa ribet.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/produk"
                search={{ kategori: undefined as string | undefined }}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90"
              >
                Lihat Produk <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://wa.me/6282276441753"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-background px-6 text-sm font-bold hover:bg-secondary"
              >
                Konsultasi via WhatsApp
              </a>
            </div>
            <div className="mt-10 flex items-center gap-8 text-sm">
              <div>
                <div className="text-2xl font-extrabold text-primary">{nf(totalProducts)}</div>
                <div className="text-xs text-muted-foreground">Model Produk</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="text-2xl font-extrabold text-primary">{nf(totalCategories)}</div>
                <div className="text-xs text-muted-foreground">Kategori</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="text-2xl font-extrabold text-primary">{nf(totalStock)}</div>
                <div className="text-xs text-muted-foreground">Pasang Ready</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt={`Stok sandal grosir ${storeName}`}
              width={1280}
              height={960}
              className="aspect-[5/4] w-full rounded-2xl object-cover shadow-2xl shadow-primary/10"
            />
            {totalStock > 0 && (
              <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-border bg-card p-4 shadow-lg md:block">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ready Stock</div>
                <div className="mt-1 text-2xl font-extrabold text-primary">{nf(totalStock)} Pasang</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-4">
          {[
            { icon: Tag, title: "Harga Grosir", desc: "Termurah langsung dari pabrik" },
            { icon: Package, title: "Stok Besar", desc: "Ribuan kodi selalu ready" },
            { icon: Truck, title: "Kirim Nasional", desc: "Ekspedisi murah seluruh RI" },
            { icon: ShieldCheck, title: "Terpercaya", desc: "Resmi & berpengalaman sejak 2010" },
          ].map((it) => (
            <div key={it.title} className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <it.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold">{it.title}</div>
                <div className="text-sm text-muted-foreground">{it.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">
              <span className="text-primary">Kategori</span> Utama
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih segmen pasar Anda</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 3).map((cat, i) => {
            const sample = products.find((p) => p.categoryId === cat.id);
            return (
              <Link
                key={cat.id}
                to="/produk"
                search={{ kategori: cat.slug }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="aspect-[3/2] overflow-hidden bg-secondary/30">
                  {sample && (
                    <img
                      src={sample.images[0]}
                      alt={cat.name}
                      loading="lazy"
                      width={600}
                      height={400}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand">
                    0{i + 1}
                  </div>
                  <div className="mt-1 text-xl font-bold">{cat.name}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs">
                    Lihat koleksi <ArrowRight className="size-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold md:text-3xl">
                <span className="text-primary">Produk Pilihan</span> dari Kami
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Stok terbaru pilihan tim kurasi</p>
            </div>
            <Link
              to="/produk"
              search={{ kategori: undefined as string | undefined }}
              className="hidden text-sm font-bold text-brand hover:underline sm:inline"
            >
              Lihat Semua →
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada produk untuk ditampilkan.</p>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* BEST SELLER */}
      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold md:text-3xl">
                <span className="text-brand">Koleksi</span> Lainnya
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Produk lain dari katalog kami</p>
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      <section className="border-y border-border bg-card py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-10 text-center text-2xl font-extrabold md:text-3xl">
            Dipercaya <span className="text-primary">Ribuan Reseller</span>
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: "Toko Jaya Makmur", loc: "Banjarmasin, Kalsel", text: "Stok selalu ready, pengiriman ke Kalimantan sangat lancar. Margin toko saya jadi lebih sehat." },
              { name: "Bpk. Slamet", loc: "Grosir Sepatu Surabaya", text: "CS responsif membantu carikan ekspedisi termurah. Sandalnya laku keras di pasar grosir." },
              { name: "Ibu Rahma", loc: "Reseller Online Medan", text: "Kualitas sandal stabil, tidak ada cacat satu kodi pun. Sangat direkomendasikan." },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-border bg-background p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-brand">★</span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                <div className="mt-5">
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.loc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 text-center text-primary-foreground shadow-xl">
          <h2 className="text-3xl font-extrabold md:text-4xl">Siap Order Partai Besar?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Konsultasi stok, harga grosir bertingkat, dan estimasi pengiriman langsung dengan admin kami via WhatsApp.
          </p>
          <a
            href="https://wa.me/6282276441753"
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-md bg-brand px-8 font-bold text-brand-foreground shadow hover:bg-brand-dark"
          >
            Chat Admin Sekarang
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
