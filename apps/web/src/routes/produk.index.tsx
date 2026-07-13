import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProductCard } from "@/components/site/ProductCard";
import { useProducts, useCategories, useBrands } from "@/hooks/queries";
import { Search } from "lucide-react";

type Search = { kategori?: string; merk?: string; q?: string };

export const Route = createFileRoute("/produk/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    kategori: typeof s.kategori === "string" ? s.kategori : undefined,
    merk: typeof s.merk === "string" ? s.merk : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Katalog Produk — upstok" },
      { name: "description", content: "Katalog lengkap sandal grosir pria, wanita, dan anak. Harga grosir mulai Rp 6.500 per pasang." },
    ],
  }),
  component: KatalogPage,
});

function KatalogPage() {
  const { kategori, merk, q: urlQ } = Route.useSearch();
  const [q, setQ] = useState(urlQ ?? "");
  const [page, setPage] = useState(1);
  const perPage = 12;

  // Sync the local search box when the header search changes the URL `q`.
  useEffect(() => {
    setQ(urlQ ?? "");
    setPage(1);
  }, [urlQ]);

  // Real categories for the resolved tenant; resolve the URL slug → id so the
  // API can filter server-side.
  const { data: categories = [] } = useCategories();
  const activeCat = categories.find((c) => c.slug === kategori);
  const { data: brands = [] } = useBrands();
  const activeBrand = brands.find((b) => b.slug === merk);

  // Live catalog from the API (active products, filtered by category + brand
  // server-side).
  const { data } = useProducts({
    search: q || undefined,
    categoryId: activeCat?.id,
    brandId: activeBrand?.id,
  });
  const products = data?.items ?? [];

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (q && !`${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [products, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-1 text-xs text-muted-foreground">
          Beranda / Katalog{activeCat ? ` / ${activeCat.name}` : ""}
        </div>
        <h1 className="mb-6 text-2xl font-extrabold md:text-3xl">
          {activeCat ? activeCat.name : "Semua Produk"}
          <span className="ml-3 text-sm font-normal text-muted-foreground">{filtered.length} produk</span>
        </h1>

        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Cari produk..."
                className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Kategori</h3>
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/produk"
                    search={{ kategori: undefined as string | undefined, merk }}
                    className={`block rounded px-2 py-1.5 text-sm hover:bg-secondary ${!kategori ? "bg-secondary font-bold text-primary" : ""}`}
                  >
                    Semua Produk
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/produk"
                      search={{ kategori: c.slug, merk }}
                      className={`block rounded px-2 py-1.5 text-sm hover:bg-secondary ${kategori === c.slug ? "bg-secondary font-bold text-primary" : ""}`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {brands.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Merk</h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/produk"
                      search={{ kategori, merk: undefined as string | undefined }}
                      className={`block rounded px-2 py-1.5 text-sm hover:bg-secondary ${!merk ? "bg-secondary font-bold text-primary" : ""}`}
                    >
                      Semua Merk
                    </Link>
                  </li>
                  {brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        to="/produk"
                        search={{ kategori, merk: b.slug }}
                        className={`block rounded px-2 py-1.5 text-sm hover:bg-secondary ${merk === b.slug ? "bg-secondary font-bold text-primary" : ""}`}
                      >
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          <div>
            {pageItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
                Tidak ada produk yang cocok.
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {pageItems.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`grid size-9 place-items-center rounded text-sm ${
                      page === i + 1
                        ? "bg-primary text-primary-foreground font-bold"
                        : "border border-border hover:bg-secondary"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
