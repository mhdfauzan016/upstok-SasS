import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/store/auth";
import { useBranding } from "@/hooks/queries";
import { resolveTenantSlug } from "@/lib/tenant/resolve";
import { LayoutDashboard, Package, FolderTree, Tags, ShoppingBag, Warehouse, FileBarChart, Settings, LogOut, Menu } from "lucide-react";

/** First letter of a label, for the logo/avatar fallback. */
const initial = (s: string | undefined | null) =>
  (s?.trim()?.[0] ?? "?").toUpperCase();

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produk", label: "Produk", icon: Package },
  { to: "/admin/kategori", label: "Kategori", icon: FolderTree },
  { to: "/admin/merk", label: "Merk", icon: Tags },
  { to: "/admin/pesanan", label: "Pesanan", icon: ShoppingBag },
  { to: "/admin/inventori", label: "Inventori", icon: Warehouse },
  { to: "/admin/laporan", label: "Laporan", icon: FileBarChart },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const isAdmin = useAuth((s) => s.isAdmin);
  const ready = useAuth((s) => s.ready);
  const bootstrap = useAuth((s) => s.bootstrap);
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const { data: branding } = useBranding();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);

  const storeName = branding?.name ?? `Toko ${resolveTenantSlug()}`;

  // Restore the session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    if (!ready) void bootstrap();
  }, [ready, bootstrap]);

  // Redirect to login once we know there's no active admin session.
  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/admin/login" });
  }, [ready, isAdmin, navigate]);

  // Reflect the active tenant in the browser tab once branding resolves.
  // NOTE: this hook must run on every render (before any early return) to keep
  // the hook order stable — otherwise reload crashes when `ready` flips.
  useEffect(() => {
    document.title = `${title} — ${storeName}`;
  }, [title, storeName]);

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat...</div>;
  }
  if (!isAdmin) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Mengarahkan ke login...</div>;
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-card transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={storeName} className="size-8 rounded-md object-cover" />
          ) : (
            <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground font-extrabold text-sm">
              {initial(storeName)}
            </div>
          )}
          <div>
            <div className="text-sm font-extrabold text-primary leading-tight">{storeName}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin Panel</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                isActive(n.to, n.exact) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-3 space-y-2">
          <Link to="/" className="block rounded-md border border-border bg-background px-3 py-2 text-center text-xs font-medium hover:bg-secondary">
            ← Lihat Website
          </Link>
          <button
            onClick={() => { logout(); navigate({ to: "/admin/login" }); }}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/20"
          >
            <LogOut className="size-3.5" /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:ml-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-5">
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu"><Menu className="size-5" /></button>
          <h1 className="text-sm font-bold">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-xs font-bold">{user?.name ?? storeName}</div>
              <div className="text-[10px] text-muted-foreground">{user?.email ?? ""}</div>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
              {initial(user?.name ?? storeName)}
            </div>
          </div>
        </header>
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
