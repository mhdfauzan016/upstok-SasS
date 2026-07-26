import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useTenantProfile, useUpdateTenant } from "@/hooks/queries";
import { ApiError } from "@/lib/api/errors";
import { tenantService } from "@/services/tenant.service";
import { ArrowLeft, ArrowRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

const MAX_HERO_IMAGES = 10;

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
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    setHeroImages(profile.branding.heroImages ?? []);
  }, [profile]);

  const onPickHeroFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file
    if (files.length === 0) return;

    const room = MAX_HERO_IMAGES - heroImages.length;
    if (room <= 0) {
      toast.error(`Maksimal ${MAX_HERO_IMAGES} gambar hero`);
      return;
    }
    const toUpload = files.slice(0, room);
    if (files.length > room) {
      toast.warning(`Hanya ${room} gambar pertama yang diunggah (maks ${MAX_HERO_IMAGES})`);
    }

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        urls.push(await tenantService.uploadHeroImage(file));
      }
      setHeroImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} gambar diunggah — jangan lupa Simpan`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal mengunggah";
      toast.error(`Gagal mengunggah: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const removeHero = (i: number) =>
    setHeroImages((prev) => prev.filter((_, idx) => idx !== i));

  const moveHero = (i: number, dir: -1 | 1) =>
    setHeroImages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

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
          heroImages,
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

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 font-bold">Gambar Hero (Slideshow)</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Gambar ini tampil bergantian (slide) di bagian atas halaman depan toko. Urutkan sesuai keinginan.
              Jika kosong, gambar bawaan akan dipakai. Maks {MAX_HERO_IMAGES} gambar, 5 MB/gambar (jpeg, png, webp, gif).
            </p>

            {heroImages.length > 0 && (
              <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {heroImages.map((url, i) => (
                  <li key={url} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Hero ${i + 1}`} className="aspect-[5/4] w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => moveHero(i, -1)}
                        disabled={i === 0}
                        className="grid size-7 place-items-center rounded bg-white/90 text-foreground disabled:opacity-30"
                        aria-label="Geser kiri"
                      >
                        <ArrowLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeHero(i)}
                        className="grid size-7 place-items-center rounded bg-destructive text-destructive-foreground"
                        aria-label="Hapus gambar"
                      >
                        <X className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveHero(i, 1)}
                        disabled={i === heroImages.length - 1}
                        className="grid size-7 place-items-center rounded bg-white/90 text-foreground disabled:opacity-30"
                        aria-label="Geser kanan"
                      >
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={onPickHeroFiles}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || heroImages.length >= MAX_HERO_IMAGES}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-dashed border-border px-5 text-sm font-bold hover:bg-secondary disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {uploading ? "Mengunggah…" : "Tambah Gambar"}
            </button>
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
