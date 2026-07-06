import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useTenantProfile, useUpdateTenant } from "@/hooks/queries";
import { ApiError } from "@/lib/api/errors";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — Admin" }] }),
  component: AdminPengaturan,
});

type FieldErrors = { name?: string; email?: string };

function AdminPengaturan() {
  const { data: profile, isLoading } = useTenantProfile();
  const update = useUpdateTenant();

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  // Seed the form once the profile loads.
  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      description: profile.branding.description ?? "",
      address: profile.branding.address ?? "",
      phone: profile.branding.phone ?? "",
      email: profile.branding.email ?? "",
    });
  }, [profile]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (form.name.trim().length < 2) next.name = "Nama toko minimal 2 karakter";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Format email tidak valid";
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    update.mutate(
      {
        name: form.name.trim(),
        branding: {
          description: form.description.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        },
      },
      {
        onSuccess: () => toast.success("Pengaturan tersimpan"),
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "Gagal menyimpan";
          toast.error(`Gagal menyimpan: ${msg}`);
        },
      },
    );
  };

  return (
    <AdminShell title="Pengaturan Toko">
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">Memuat…</div>
      ) : (
        <form onSubmit={submit} className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 font-bold">Profil Toko</h3>
            <p className="mb-4 text-xs text-muted-foreground">Informasi ini tampil di storefront (footer & halaman toko).</p>
            <div className="space-y-4">
              <Field label="Nama Toko *" error={errors.name}>
                <input value={form.name} onChange={set("name")} className={`input ${errors.name ? "input-error" : ""}`} />
              </Field>
              <Field label="Deskripsi">
                <textarea value={form.description} onChange={set("description")} maxLength={500} className="input min-h-[88px]" placeholder="Ceritakan tentang toko Anda…" />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-bold">Kontak</h3>
            <div className="space-y-4">
              <Field label="Alamat">
                <textarea value={form.address} onChange={set("address")} maxLength={300} className="input min-h-[64px]" placeholder="Jl. Contoh No. 1, Kota, Provinsi" />
              </Field>
              <Field label="Nomor Telepon / WhatsApp">
                <input value={form.phone} onChange={set("phone")} className="input" placeholder="0822-xxxx-xxxx" />
              </Field>
              <Field label="Email" error={errors.email}>
                <input value={form.email} onChange={set("email")} className={`input ${errors.email ? "input-error" : ""}`} placeholder="sales@toko.com" />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button disabled={update.isPending} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {update.isPending && <Loader2 className="size-4 animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      )}

      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-primary)}.input.input-error{border-color:var(--color-destructive)}`}</style>
    </AdminShell>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}
