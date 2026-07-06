/**
 * Type-safe mirror of the NestJS API contracts (/api/v1). These describe what
 * the server returns; UI-facing types (src/mock/types) are produced by mappers
 * in the service layer so existing components stay untouched.
 */

export type ApiScope = "platform" | "tenant" | "customer";

export interface ApiMoney {
  amount: number; // minor units (e.g. sen)
  currency: string;
}

export interface ApiProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: ApiMoney;
  images: string[];
  colors: string[];
  sizes: string[];
  category: { id: string; name: string } | null;
  status: string;
  stock: number;
  available: boolean;
}

export interface ApiProductDetail extends ApiProductListItem {
  description: string | null;
  quantityAvailable: number;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  productCount: number;
}

export interface ApiInventoryItem {
  productId: string;
  productName: string;
  sku: string;
  quantityOnHand: number;
  reservedQuantity: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  lowStock: boolean;
  updatedAt: string;
}

export type ApiMovementType = "restock" | "adjustment" | "sale" | "return";

export interface ApiStockMovement {
  id: string;
  type: ApiMovementType;
  quantityChange: number;
  quantityAfter: number;
  note: string | null;
  actorId: string | null;
  createdAt: string;
}

export type ApiOrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export interface ApiOrderCustomer {
  name: string;
  phone: string;
  address: string;
  notes: string | null;
}

export interface ApiOrderItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: ApiMoney;
  quantity: number;
  lineTotal: ApiMoney;
}

export interface ApiOrderListItem {
  id: string;
  orderNumber: string;
  status: ApiOrderStatus;
  customer: ApiOrderCustomer;
  subtotal: ApiMoney;
  total: ApiMoney;
  itemCount: number;
  createdAt: string;
}

export interface ApiOrderDetail extends ApiOrderListItem {
  items: ApiOrderItem[];
}

export interface CreateOrderPayload {
  customer: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
  };
  items: { productId: string; quantity: number }[];
}

export interface ApiReportSummary {
  range: { from: string; to: string };
  currency: string;
  revenue: { total: number; orderCount: number; avgOrderValue: number };
  ordersByStatus: { status: ApiOrderStatus; count: number; revenue: number }[];
  revenueByMonth: { month: string; orders: number; revenue: number }[];
  topProducts: {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }[];
  inventory: {
    totalOnHand: number;
    stockValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
    productCount: number;
  };
}

export interface ApiPaginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface ApiTenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  theme: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

/** GET /tenant — console profile (auth required). */
export interface ApiTenantProfile {
  id: string;
  slug: string;
  name: string;
  status: string;
  branding: {
    logoUrl: string | null;
    primaryColor: string | null;
    theme: string | null;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  plan: { code: string; name: string } | null;
  subscriptionStatus: string | null;
}

/** PATCH /tenant payload. */
export interface UpdateTenantPayload {
  name?: string;
  branding?: {
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export interface ApiAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  scope: ApiScope;
  tenantId: string | null;
}

export interface ApiLoginResponse {
  accessToken: string;
  user: ApiAuthUser;
}

export interface ApiRefreshResponse {
  accessToken: string;
}

/** Error envelope returned by the API exception filter. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
