import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/store/auth";
import { useBranding } from "@/hooks/queries";
import { resolveTenantSlug } from "@/lib/tenant/resolve";
import { toast } from "sonner";

export const Route = createFileRoute("/masuk")({
  head: () => ({ meta: [{ title: "Masuk — upstok" }] }),
  component: CustomerLogin,
});

function CustomerLogin() {
  const loginCustomer = useAuth((s) => s.loginCustomer);
  const { data: branding } = useBranding();
  const storeName = branding?.name ?? `Toko ${resolveTenantSlug()}`;
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await loginCustomer(email.trim(), password);
    setSubmitting(false);
    if (ok) {
      toast.success("Berhasil masuk");
      navigate({ to: "/produk", search: { kategori: undefined, merk: undefined, q: undefined } });
    } else {
      toast.error("Email/password salah, atau akun Anda belum disetujui admin.");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 via-background to-brand/10 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground font-extrabold">
            {storeName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xl font-extrabold text-primary">{storeName}</span>
        </Link>
        <h1 className="text-center text-xl font-bold">Masuk Akun Pelanggan</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Masuk untuk melihat harga grosir & memesan</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </label>
          <button disabled={submitting} className="h-11 w-full rounded-md bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {submitting ? "Memproses…" : "Masuk"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link to="/daftar" className="font-bold text-primary hover:underline">Daftar di sini</Link>
        </p>
        <p className="mt-3 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:underline">← Kembali ke toko</Link>
        </p>
      </div>
    </div>
  );
}
