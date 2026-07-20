import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authService } from "@/services/auth.service";
import { useBranding } from "@/hooks/queries";
import { resolveTenantSlug } from "@/lib/tenant/resolve";
import { waChatUrl } from "@/lib/whatsapp";
import { ApiError } from "@/lib/api/errors";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/daftar")({
  head: () => ({ meta: [{ title: "Daftar — upstok" }] }),
  component: CustomerRegister,
});

type Form = { name: string; phone: string; email: string; password: string };

function CustomerRegister() {
  const { data: branding } = useBranding();
  const storeName = branding?.name ?? `Toko ${resolveTenantSlug()}`;
  const [form, setForm] = useState<Form>({ name: "", phone: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** wa.me message the customer sends to the admin to request approval. */
  const notifyAdminUrl = () =>
    waChatUrl(
      branding?.phone,
      [
        `Halo Admin ${storeName}, saya baru mendaftar sebagai pelanggan dan menunggu persetujuan:`,
        "",
        `Nama  : ${form.name}`,
        `No HP : ${form.phone}`,
        `Email : ${form.email}`,
        "",
        "Mohon akun saya diaktifkan agar bisa melihat harga & memesan. Terima kasih!",
      ].join("\n"),
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error("Lengkapi semua data. Password minimal 8 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      await authService.register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toast.error("Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Gagal mendaftar. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 via-background to-brand/10 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground font-extrabold">
            {storeName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xl font-extrabold text-primary">{storeName}</span>
        </Link>

        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold">Pendaftaran Terkirim!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Akun Anda sedang menunggu persetujuan admin. Untuk mempercepat, beri tahu admin
              melalui WhatsApp. Anda akan bisa masuk setelah akun disetujui.
            </p>
            <a
              href={notifyAdminUrl()}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] font-bold text-white hover:bg-[#1eb854]"
            >
              <MessageCircle className="size-4" /> Beritahu Admin via WhatsApp
            </a>
            <Link to="/masuk" className="mt-3 block text-sm font-bold text-primary hover:underline">
              Sudah disetujui? Masuk di sini
            </Link>
            <Link to="/" className="mt-4 block text-xs text-muted-foreground hover:underline">← Kembali ke toko</Link>
          </div>
        ) : (
          <>
            <h1 className="text-center text-xl font-bold">Daftar Akun Pelanggan</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Daftar untuk melihat harga grosir & memesan. Akun aktif setelah disetujui admin.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field label="Nama Lengkap / Toko">
                <input value={form.name} onChange={set("name")} className="input" />
              </Field>
              <Field label="Nomor WhatsApp">
                <input value={form.phone} onChange={set("phone")} placeholder="0812xxxxxxxx" className="input" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={set("email")} className="input" />
              </Field>
              <Field label="Password (min. 8 karakter)">
                <input type="password" value={form.password} onChange={set("password")} className="input" />
              </Field>
              <button disabled={submitting} className="h-11 w-full rounded-md bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {submitting ? "Memproses…" : "Daftar"}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link to="/masuk" className="font-bold text-primary hover:underline">Masuk di sini</Link>
            </p>
            <p className="mt-3 text-center">
              <Link to="/" className="text-xs text-muted-foreground hover:underline">← Kembali ke toko</Link>
            </p>
          </>
        )}
      </div>
      <style>{`.input{width:100%;height:2.5rem;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:0 .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
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
