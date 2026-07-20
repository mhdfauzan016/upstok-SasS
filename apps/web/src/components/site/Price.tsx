import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useAuth } from "@/store/auth";
import { rupiah } from "@/lib/format";

/** True when the visitor may see prices / place orders (approved customer). */
export function usePriceVisible(): boolean {
  return useAuth((s) => s.isCustomer);
}

/**
 * Renders a product price for approved customers, or a "login to see price"
 * prompt for guests. Wholesale prices are hidden until a tenant admin has
 * approved the customer's account.
 */
export function Price({
  amount,
  className = "",
  size = "md",
}: {
  amount: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const visible = usePriceVisible();
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";

  if (visible) {
    return (
      <span className={`font-extrabold text-brand ${textSize} ${className}`}>
        {rupiah(amount)}
      </span>
    );
  }

  return (
    <Link
      to="/masuk"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded font-semibold text-primary hover:underline ${size === "lg" ? "text-sm" : "text-xs"} ${className}`}
    >
      <Lock className="size-3.5" /> Login untuk lihat harga
    </Link>
  );
}
