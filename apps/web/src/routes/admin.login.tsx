import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Login Admin — upstok" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(email, password)) {
      toast.success("Login berhasil");
      navigate({ to: "/admin" });
    } else {
      toast.error("Email atau password salah");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 via-background to-brand/10 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground font-extrabold">U</div>
          <span className="text-xl font-extrabold text-primary">upstok<span className="text-brand">.</span></span>
        </Link>
        <h1 className="text-center text-xl font-bold">Login Admin Panel</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Masuk untuk mengelola toko</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </label>
          <button className="h-11 w-full rounded-md bg-primary font-bold text-primary-foreground hover:bg-primary/90">
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
