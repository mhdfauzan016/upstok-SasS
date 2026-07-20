import { api } from "@/lib/api/client";
import type { ApiCustomer } from "@/lib/api/types";

export type CustomerStatus = "pending" | "active" | "disabled";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  createdAt: string;
}

export interface ListCustomersParams {
  status?: CustomerStatus;
}

export const customersService = {
  async list(params: ListCustomersParams = {}): Promise<CustomerRow[]> {
    return api.get<ApiCustomer[]>("/customers", {
      query: { status: params.status },
    });
  },

  async setStatus(id: string, status: "active" | "disabled"): Promise<CustomerRow> {
    return api.patch<ApiCustomer>(`/customers/${id}`, { status });
  },
};
