import { api } from "@/lib/api/client";
import type {
  ApiPaginated,
  ApiProductDetail,
  ApiProductListItem,
} from "@/lib/api/types";
import type { Product } from "@/mock/types";
import fallbackImg from "@/assets/product-1.jpg";

/**
 * Maps an API product onto the UI's existing `Product` shape so components
 * render unchanged. Fields the backend doesn't model yet (sizes, colors,
 * bestSeller/featured) default to safe empties.
 *
 * Price note: the API stores money in minor units; the UI works in whole
 * rupiah, so we divide by 100.
 */
function mapProduct(
  src: ApiProductListItem | ApiProductDetail,
): Product {
  const detail = src as Partial<ApiProductDetail>;
  return {
    id: src.id,
    slug: src.slug,
    name: src.name,
    sku: src.sku,
    categoryId: src.category?.id ?? "",
    brandId: src.brand?.id ?? "",
    price: Math.round(src.price.amount / 100),
    stock: src.stock,
    description: detail.description ?? "",
    sizes: src.sizes ?? [],
    colors: src.colors ?? [],
    images: src.images.length > 0 ? src.images : [fallbackImg],
    bestSeller: false,
    featured: false,
  };
}

export interface ListProductsParams {
  categoryId?: string;
  brandId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

/** Fields the product create/update UI collects that the API can persist. */
export interface SaveProductInput {
  name: string;
  sku: string;
  slug?: string;
  priceRupiah: number;
  description?: string;
  images: string[];
  colors: string[];
  sizes: string[];
  categoryId?: string;
  brandId?: string;
}

export const productsService = {
  async list(params: ListProductsParams = {}): Promise<ProductPage> {
    const res = await api.get<ApiPaginated<ApiProductListItem>>("/products", {
      auth: false,
      query: {
        categoryId: params.categoryId,
        brandId: params.brandId,
        search: params.search,
        page: params.page ?? 1,
        limit: params.limit ?? 100,
      },
    });
    return {
      items: res.data.map(mapProduct),
      total: res.meta.total,
      page: res.meta.page,
      limit: res.meta.limit,
    };
  },

  async getBySlug(slug: string): Promise<Product> {
    const res = await api.get<ApiProductDetail>(
      `/products/${encodeURIComponent(slug)}`,
      { auth: false },
    );
    return mapProduct(res);
  },

  /**
   * Uploads a single product image (multipart) and returns its public URL.
   * Requires an authenticated tenant session with `product:write`.
   */
  async uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post<{ url: string }>("/products/uploads", fd);
    return res.url;
  },

  /**
   * Creates a product. UI prices are whole rupiah; the API stores minor units,
   * so we multiply by 100. `categoryId` is intentionally omitted until the
   * Categories API is wired on the web (mock category ids aren't real UUIDs).
   * Created as `active` so it appears in the (active-only) admin list.
   */
  async create(input: SaveProductInput): Promise<Product> {
    const res = await api.post<ApiProductDetail>("/products", {
      name: input.name,
      sku: input.sku,
      slug: input.slug || undefined,
      price: { amount: Math.round(input.priceRupiah * 100), currency: "IDR" },
      description: input.description || undefined,
      images: input.images,
      colors: input.colors,
      sizes: input.sizes,
      categoryId: input.categoryId || undefined,
      brandId: input.brandId || undefined,
      status: "active",
    });
    return mapProduct(res);
  },

  async update(id: string, input: SaveProductInput): Promise<Product> {
    const res = await api.patch<ApiProductDetail>(`/products/${id}`, {
      name: input.name,
      sku: input.sku,
      price: { amount: Math.round(input.priceRupiah * 100), currency: "IDR" },
      description: input.description || undefined,
      images: input.images,
      colors: input.colors,
      sizes: input.sizes,
      categoryId: input.categoryId || undefined,
      brandId: input.brandId || undefined,
    });
    return mapProduct(res);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
