/** Permission strings consumed by the RbacGuard via @RequirePermission(). */
export const Permission = {
  // Tenant self-service
  SETTINGS_WRITE: 'settings:write',
  // Catalog
  PRODUCT_WRITE: 'product:write',
  PRODUCT_DELETE: 'product:delete',
  CATEGORY_WRITE: 'category:write',
  CATEGORY_DELETE: 'category:delete',
  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  // Orders
  ORDER_READ: 'order:read',
  ORDER_WRITE: 'order:write',
  // Platform
  TENANT_MANAGE: 'tenant:manage',
  TENANT_SUSPEND: 'tenant:suspend',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
