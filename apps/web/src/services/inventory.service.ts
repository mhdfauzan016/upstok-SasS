import { api } from "@/lib/api/client";
import type {
  ApiInventoryItem,
  ApiMovementType,
  ApiPaginated,
  ApiStockMovement,
} from "@/lib/api/types";

export interface ListInventoryParams {
  search?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface InventoryPage {
  items: ApiInventoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdjustStockInput {
  productId: string;
  quantityChange: number;
  type?: ApiMovementType;
  note?: string;
}

export const inventoryService = {
  async list(params: ListInventoryParams = {}): Promise<InventoryPage> {
    const res = await api.get<ApiPaginated<ApiInventoryItem>>("/inventory", {
      query: {
        search: params.search,
        lowStock: params.lowStock ? "true" : undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 100,
      },
    });
    return {
      items: res.data,
      total: res.meta.total,
      page: res.meta.page,
      limit: res.meta.limit,
    };
  },

  async lowStock(): Promise<ApiInventoryItem[]> {
    return api.get<ApiInventoryItem[]>("/inventory/alerts/low-stock");
  },

  async movements(
    productId: string,
    page = 1,
    limit = 50,
  ): Promise<ApiPaginated<ApiStockMovement>> {
    return api.get<ApiPaginated<ApiStockMovement>>(
      `/inventory/${productId}/movements`,
      { query: { page, limit } },
    );
  },

  async adjust(input: AdjustStockInput): Promise<ApiInventoryItem> {
    const { productId, ...body } = input;
    return api.post<ApiInventoryItem>(`/inventory/${productId}/adjust`, body);
  },

  async updateThreshold(
    productId: string,
    lowStockThreshold: number,
  ): Promise<ApiInventoryItem> {
    return api.patch<ApiInventoryItem>(`/inventory/${productId}`, {
      lowStockThreshold,
    });
  },
};
