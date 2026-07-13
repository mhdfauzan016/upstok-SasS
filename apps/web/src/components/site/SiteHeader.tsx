import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, Search, MessageCircle, Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { useCategories, useBranding } from "@/hooks/queries";
import { resolveTenantSlug } from "@/lib/tenant/resolve";
import { waChatUrl } from "@/lib/whatsapp";

export function SiteHeader() {
  const count = useCart((s) => s.count());
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [term, setTerm] = useState("");
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const { data: categories = [] } = useCategories();
  const { data: branding } = useBranding();
  const storeName = branding?.name ?? `Toko ${resolveTenantSlug()}`;
  const initial = storeName.charAt(0).toUpperCase() || "S";

  // Search is only relevant while browsing products — hide it elsewhere
  // (cart, checkout, etc.).
  const showSearch = pathname === "/" || pathname.startsWith("/produk");

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/produk",
      search: { kategori: undefined, q: term.trim() || undefined },
    });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      {/* utility bar */}
      <div className="hidden bg-primary text-primary-foreground md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs">
          <span>Senin–Sabtu, 08:00–17:00 WIB</span>
          <div className="flex items-center gap-4">
            {branding?.phone && (
              <a href={waChatUrl(branding.phone)} className="inline-flex items-center gap-1.5 hover:text-brand">
                <MessageCircle className="size-3.5" /> WhatsApp {branding.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>

        <Link to="/" className="flex items-center gap-2 shrink-0">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={storeName} className="size-9 rounded-md object-cover" />
          ) : (
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground font-extrabold">
              {initial}
            </div>
          )}
          <div className="leading-tight">
            <div className="font-extrabold tracking-tight text-primary">
              {storeName}<span className="text-brand">.</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Grosir Sandal Indonesia
            </div>
          </div>
        </Link>

        {showSearch && (
          <form onSubmit={runSearch} className="ml-2 hidden flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Cari model sandal atau SKU..."
                className="h-10 w-full rounded-md border border-border bg-secondary/40 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-background"
              />
            </div>
          </form>
        )}

        <Link
          to="/keranjang"
          className="relative ml-auto inline-flex size-10 items-center justify-center rounded-md hover:bg-secondary"
          aria-label="Keranjang"
        >
          <ShoppingCart className="size-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
              {count}
            </span>
          )}
        </Link>
      </div>

      {/* primary nav */}
      <nav className="hidden border-t border-border bg-secondary/30 md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-2">
          <Link
            to="/"
            className={`whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium hover:bg-background ${pathname === "/" ? "text-primary" : "text-foreground"}`}
          >
            Beranda
          </Link>
          <Link
            to="/produk"
            search={{ kategori: undefined, q: undefined }}
            className="whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium hover:bg-background"
          >
            Semua Produk
          </Link>

          {categories.length > 0 && (
            <div
              className="relative"
              onMouseLeave={() => setCatOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                onMouseEnter={() => setCatOpen(true)}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground"
              >
                Kategori <ChevronDown className={`size-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`} />
              </button>
              {catOpen && (
                <div className="absolute left-0 top-full z-50 min-w-[200px] rounded-md border border-border bg-card py-1 shadow-lg">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      to="/produk"
                      search={{ kategori: c.slug, q: undefined }}
                      onClick={() => setCatOpen(false)}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-secondary"
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.productCount}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <a
            href={waChatUrl(branding?.phone)}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground"
          >
            Kontak
          </a>
        </div>
      </nav>

      {/* mobile drawer */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-1 px-4 py-3">
            {showSearch && (
              <form onSubmit={runSearch} className="mb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Cari produk atau SKU..."
                    className="h-10 w-full rounded-md border border-border bg-secondary/40 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-background"
                  />
                </div>
              </form>
            )}
            <Link to="/" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium hover:bg-secondary">Beranda</Link>
            <Link to="/produk" search={{ kategori: undefined, q: undefined }} onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium hover:bg-secondary">Semua Produk</Link>
            {categories.length > 0 && (
              <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kategori</div>
            )}
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/produk"
                search={{ kategori: c.slug, q: undefined }}
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                {c.name}
              </Link>
            ))}
            <a href={waChatUrl(branding?.phone)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">Kontak</a>
          </div>
        </div>
      )}
    </header>
  );
}
