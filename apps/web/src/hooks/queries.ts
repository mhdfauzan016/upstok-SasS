import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  productsService,
  type ListProductsParams,
  type SaveProductInput,
} from "@/services/products.service";
import {
  inventoryService,
  type AdjustStockInput,
  type ListInventoryParams,
} from "@/services/inventory.service";
import {
  ordersService,
  type ListOrdersParams,
} from "@/services/orders.service";
import {
  categoriesService,
  type SaveCategoryInput,
} from "@/services/categories.service";
import {
  brandsService,
  type SaveBrandInput,
} from "@/services/brands.service";
import { reportsService, type ReportRange } from "@/services/reports.service";
import type {
  ApiOrderStatus,
  CreateOrderPayload,
  UpdateTenantPayload,
} from "@/lib/api/types";
import { tenantService } from "@/services/tenant.service";
import { resolveTenantSlug } from "@/lib/tenant/resolve";

/** Query keys are tenant-scoped so cache never bleeds across tenants. */
export const queryKeys = {
  products: (params: ListProductsParams) =>
    ["products", resolveTenantSlug(), params] as const,
  product: (slug: string) =>
    ["product", resolveTenantSlug(), slug] as const,
  categories: () => ["categories", resolveTenantSlug()] as const,
  brands: () => ["brands", resolveTenantSlug()] as const,
  branding: () => ["tenant-branding", resolveTenantSlug()] as const,
  tenantProfile: () => ["tenant-profile", resolveTenantSlug()] as const,
  inventory: (params: ListInventoryParams) =>
    ["inventory", resolveTenantSlug(), params] as const,
  lowStock: () => ["inventory-low-stock", resolveTenantSlug()] as const,
  inventoryMovements: (productId: string) =>
    ["inventory-movements", resolveTenantSlug(), productId] as const,
  orders: (params: ListOrdersParams) =>
    ["orders", resolveTenantSlug(), params] as const,
  order: (id: string) => ["order", resolveTenantSlug(), id] as const,
};

export function useProducts(params: ListProductsParams = {}) {
  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => productsService.list(params),
    staleTime: 30_000,
  });
}

/** Invalidates product list/detail caches so they refetch after a write. */
function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["products", resolveTenantSlug()] });
    qc.invalidateQueries({ queryKey: ["product", resolveTenantSlug()] });
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (input: SaveProductInput) => productsService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (vars: { id: string; input: SaveProductInput }) =>
      productsService.update(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: invalidate,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: () => productsService.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => categoriesService.list(),
    staleTime: 5 * 60_000,
  });
}

/** Invalidates category + product caches (product rows carry category info). */
function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["categories", resolveTenantSlug()] });
    qc.invalidateQueries({ queryKey: ["products", resolveTenantSlug()] });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: SaveCategoryInput) => categoriesService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (vars: { id: string; input: SaveCategoryInput }) =>
      categoriesService.update(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => categoriesService.remove(id),
    onSuccess: invalidate,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands(),
    queryFn: () => brandsService.list(),
    staleTime: 5 * 60_000,
  });
}

/** Invalidates brand + product caches (product rows carry brand info). */
function useInvalidateBrands() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["brands", resolveTenantSlug()] });
    qc.invalidateQueries({ queryKey: ["products", resolveTenantSlug()] });
  };
}

export function useCreateBrand() {
  const invalidate = useInvalidateBrands();
  return useMutation({
    mutationFn: (input: SaveBrandInput) => brandsService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateBrand() {
  const invalidate = useInvalidateBrands();
  return useMutation({
    mutationFn: (vars: { id: string; input: SaveBrandInput }) =>
      brandsService.update(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteBrand() {
  const invalidate = useInvalidateBrands();
  return useMutation({
    mutationFn: (id: string) => brandsService.remove(id),
    onSuccess: invalidate,
  });
}

export function useReportSummary(range: ReportRange = {}) {
  return useQuery({
    queryKey: ["report-summary", resolveTenantSlug(), range] as const,
    queryFn: () => reportsService.summary(range),
    staleTime: 60_000,
  });
}

export function useTenantProfile() {
  return useQuery({
    queryKey: queryKeys.tenantProfile(),
    queryFn: () => tenantService.getProfile(),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTenantPayload) =>
      tenantService.updateProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-profile", resolveTenantSlug()] });
      qc.invalidateQueries({ queryKey: ["tenant-branding", resolveTenantSlug()] });
    },
  });
}

export function useBranding() {
  return useQuery({
    queryKey: queryKeys.branding(),
    queryFn: () => tenantService.getBranding(),
    staleTime: 5 * 60_000,
  });
}

export function useInventory(params: ListInventoryParams = {}) {
  return useQuery({
    queryKey: queryKeys.inventory(params),
    queryFn: () => inventoryService.list(params),
    staleTime: 15_000,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: queryKeys.lowStock(),
    queryFn: () => inventoryService.lowStock(),
    staleTime: 15_000,
  });
}

export function useInventoryMovements(productId: string) {
  return useQuery({
    queryKey: queryKeys.inventoryMovements(productId),
    queryFn: () => inventoryService.movements(productId),
    enabled: !!productId,
  });
}

/** Invalidates all inventory caches so lists/ledgers refetch after a write. */
function useInvalidateInventory() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["inventory", resolveTenantSlug()] });
    qc.invalidateQueries({
      queryKey: ["inventory-movements", resolveTenantSlug()],
    });
    qc.invalidateQueries({
      queryKey: ["inventory-low-stock", resolveTenantSlug()],
    });
  };
}

export function useAdjustStock() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: AdjustStockInput) => inventoryService.adjust(input),
    onSuccess: invalidate,
  });
}

export function useUpdateThreshold() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (vars: { productId: string; lowStockThreshold: number }) =>
      inventoryService.updateThreshold(vars.productId, vars.lowStockThreshold),
    onSuccess: invalidate,
  });
}

export function useAdminOrders(params: ListOrdersParams = {}) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => ordersService.list(params),
    staleTime: 15_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => ordersService.get(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersService.create(payload),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: ApiOrderStatus }) =>
      ordersService.updateStatus(vars.id, vars.status),
    onSuccess: () => {
      // Status changes (esp. cancellation) move stock, so refresh both.
      qc.invalidateQueries({ queryKey: ["orders", resolveTenantSlug()] });
      qc.invalidateQueries({ queryKey: ["inventory", resolveTenantSlug()] });
    },
  });
}
