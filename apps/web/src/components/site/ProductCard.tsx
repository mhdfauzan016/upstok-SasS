import { Link } from "@tanstack/react-router";
import { rupiah } from "@/lib/format";
import type { Product } from "@/mock/types";

export function ProductCard({ product }: { product: Product }) {
  const lowStock = product.stock < 200;
  return (
    <Link
      to="/produk/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/30">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          width={400}
          height={400}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {product.bestSeller && (
          <span className="absolute left-2 top-2 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-foreground">
            Best Seller
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="font-mono text-[10px] text-muted-foreground">{product.sku}</p>
        <h3 className="line-clamp-2 mt-0.5 min-h-[2.5rem] text-sm font-medium leading-tight text-foreground group-hover:text-primary">
          {product.name}
        </h3>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-base font-extrabold text-brand">{rupiah(product.price)}</span>
          <div className="flex items-center gap-1 text-[10px] font-medium">
            <span className={`size-1.5 rounded-full ${lowStock ? "bg-brand" : "bg-emerald-500"}`} />
            <span className="text-muted-foreground">
              {lowStock ? "Stok terbatas" : `Stok ${product.stock}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
