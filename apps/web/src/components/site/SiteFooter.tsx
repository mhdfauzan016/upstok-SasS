import { Link } from "@tanstack/react-router";
import { MessageCircle, MapPin, Phone, Mail } from "lucide-react";
import { useCategories, useBranding } from "@/hooks/queries";
import { resolveTenantSlug } from "@/lib/tenant/resolve";
import { waChatUrl } from "@/lib/whatsapp";

export function SiteFooter() {
  const { data: categories = [] } = useCategories();
  const { data: branding } = useBranding();
  const storeName = branding?.name ?? `Toko ${resolveTenantSlug()}`;
  const initial = storeName.charAt(0).toUpperCase() || "S";
  const year = new Date().getFullYear();

  // Contact/profile from the tenant's branding record (set in admin settings).
  const description =
    branding?.description ??
    "Toko grosir yang melayani reseller dan pelanggan dengan harga terbaik.";
  const address = branding?.address;
  const phone = branding?.phone;
  const email = branding?.email;

  return (
    <footer className="mt-20 border-t border-border bg-secondary/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground font-extrabold">{initial}</div>
            <span className="font-extrabold text-primary text-lg">{storeName}<span className="text-brand">.</span></span>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {address && (
              <div className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> {address}</div>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 hover:text-primary"><Phone className="size-4 text-primary" /> {phone}</a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="size-4 text-primary" /> {email}</a>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Kategori</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {categories.length === 0 && <li className="text-xs">Belum ada kategori</li>}
            {categories.map((c) => (
              <li key={c.id}>
                <Link to="/produk" search={{ kategori: c.slug, q: undefined }} className="hover:text-primary">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Bantuan</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Cara Order</li>
            <li>Info Pengiriman</li>
            <li>Ketentuan Retur</li>
            <li>Menjadi Reseller</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:flex-row">
          <span>© {year} {storeName}. Hak Cipta Dilindungi.</span>
          <span>
            {storeName} didukung oleh{" "}
            <a
              href="https://upstok.my.id"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-primary hover:underline"
            >
              upstok
            </a>
          </span>
        </div>
      </div>

      {/* Floating WhatsApp — only when the tenant has set a phone number. */}
      {phone && (
        <a
          href={waChatUrl(phone)}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition-transform hover:scale-105"
        >
          <MessageCircle className="size-4" />
          Chat WhatsApp
        </a>
      )}
    </footer>
  );
}
