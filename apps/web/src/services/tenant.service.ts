import { api } from "@/lib/api/client";
import type {
  ApiTenantBranding,
  ApiTenantProfile,
  UpdateTenantPayload,
} from "@/lib/api/types";

export const tenantService = {
  /** Public storefront branding for the resolved tenant. */
  getBranding(): Promise<ApiTenantBranding> {
    return api.get<ApiTenantBranding>("/tenant/branding", { auth: false });
  },

  /** Authenticated tenant profile (admin console). */
  getProfile(): Promise<ApiTenantProfile> {
    return api.get<ApiTenantProfile>("/tenant");
  },

  /** Update store name + branding/contact fields. */
  updateProfile(payload: UpdateTenantPayload): Promise<ApiTenantProfile> {
    return api.patch<ApiTenantProfile>("/tenant", payload);
  },
};
