import { api } from "@/lib/api/client";
import type {
  ApiOrderDetail,
  ApiOrderListItem,
  ApiOrderStatus,
  ApiPaginated,
  CreateOrderPayload,
} from "@/lib/api/types";

export interface ListOrdersParams {
  status?: ApiOrderStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrderPage {
  items: ApiOrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export const ordersService = {
  /** Guest checkout — no auth, tenant resolved from the subdomain header. */
  async create(payload: CreateOrderPayload): Promise<ApiOrderDetail> {
    return api.post<ApiOrderDetail>("/orders", payload, { auth: false });
  },

  async list(params: ListOrdersParams = {}): Promise<OrderPage> {
    const res = await api.get<ApiPaginated<ApiOrderListItem>>("/orders", {
      query: {
        status: params.status,
        search: params.search,
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

  async get(id: string): Promise<ApiOrderDetail> {
    return api.get<ApiOrderDetail>(`/orders/${id}`);
  },

  async updateStatus(
    id: string,
    status: ApiOrderStatus,
  ): Promise<ApiOrderDetail> {
    return api.patch<ApiOrderDetail>(`/orders/${id}/status`, { status });
  },
};
