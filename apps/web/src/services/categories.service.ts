import { api } from "@/lib/api/client";
import type { ApiCategory } from "@/lib/api/types";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

/** Fields the category create/edit form collects. */
export interface SaveCategoryInput {
  name: string;
  /** Optional; when empty the API derives a valid slug from the name. */
  slug?: string;
}

function toOption(c: ApiCategory): CategoryOption {
  return { id: c.id, name: c.name, slug: c.slug, productCount: c.productCount };
}

export const categoriesService = {
  /** Tenant-scoped category list (public endpoint, used for nav + admin filters). */
  async list(): Promise<CategoryOption[]> {
    const res = await api.get<ApiCategory[]>("/categories", { auth: false });
    return res.map(toOption);
  },

  async create(input: SaveCategoryInput): Promise<CategoryOption> {
    const res = await api.post<ApiCategory>("/categories", {
      name: input.name,
      slug: input.slug || undefined,
    });
    return toOption(res);
  },

  async update(id: string, input: SaveCategoryInput): Promise<CategoryOption> {
    const res = await api.patch<ApiCategory>(`/categories/${id}`, {
      name: input.name,
      slug: input.slug || undefined,
    });
    return toOption(res);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
