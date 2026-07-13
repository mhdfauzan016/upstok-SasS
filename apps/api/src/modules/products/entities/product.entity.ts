/** Response shapes for the Product module. */

export interface Money {
  amount: number;
  currency: string;
}

/** Public catalog list row. SKU + stock are exposed for the wholesale catalog. */
export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: Money;
  images: string[];
  colors: string[];
  sizes: string[];
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  status: string;
  stock: number;
  available: boolean;
}

/** Public product detail. */
export interface ProductDetail extends ProductListItem {
  description: string | null;
  quantityAvailable: number;
}

/** Console-facing product (full record). */
export interface ProductAdminView extends ProductDetail {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}
