import { api } from "@/lib/api/client";
import type { ApiBrand } from "@/lib/api/types";

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

/** Fields the brand create/edit form collects. */
export interface SaveBrandInput {
  name: string;
  /** Optional; when empty the API derives a valid slug from the name. */
  slug?: string;
}

function toOption(b: ApiBrand): BrandOption {
  return { id: b.id, name: b.name, slug: b.slug, productCount: b.productCount };
}

export const brandsService = {
  /** Tenant-scoped brand list (public endpoint, used for filters + admin). */
  async list(): Promise<BrandOption[]> {
    const res = await api.get<ApiBrand[]>("/brands", { auth: false });
    return res.map(toOption);
  },

  async create(input: SaveBrandInput): Promise<BrandOption> {
    const res = await api.post<ApiBrand>("/brands", {
      name: input.name,
      slug: input.slug || undefined,
    });
    return toOption(res);
  },

  async update(id: string, input: SaveBrandInput): Promise<BrandOption> {
    const res = await api.patch<ApiBrand>(`/brands/${id}`, {
      name: input.name,
      slug: input.slug || undefined,
    });
    return toOption(res);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/brands/${id}`);
  },
};
