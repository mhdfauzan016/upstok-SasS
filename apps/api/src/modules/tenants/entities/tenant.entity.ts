/** Response shapes returned by the Tenant module (mapped from Prisma models). */

export interface TenantBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  theme: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

/** Full tenant profile for the tenant console (GET /tenant). */
export interface TenantProfile {
  id: string;
  slug: string;
  name: string;
  status: string;
  branding: TenantBranding;
  plan: { code: string; name: string } | null;
  subscriptionStatus: string | null;
}

/** Public branding for storefront theming (GET /tenant/branding). */
export interface PublicBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  theme: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

/** Row in the platform tenant list (GET /platform/tenants). */
export interface TenantListItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string | null;
  createdAt: Date;
}

/** Result of POST /tenants signup. */
export interface TenantCreated {
  tenant: { id: string; slug: string; name: string; status: string };
  owner: { id: string; email: string };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}
