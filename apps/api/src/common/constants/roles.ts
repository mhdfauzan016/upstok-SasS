import { Permission } from './permissions';

/**
 * Static role → permission map consumed by the RbacGuard (MVP).
 * Phase 2 moves tenant role permission sets into the DB without changing the
 * guard contract (@RequirePermission). Role strings match the Prisma enums
 * (PlatformRole, TenantRole) plus the customer pseudo-role.
 */
export const ROLE_PERMISSIONS: Readonly<Record<string, ReadonlySet<string>>> = {
  // Platform scope
  PLATFORM_ADMIN: new Set<string>([
    Permission.TENANT_MANAGE,
    Permission.TENANT_SUSPEND,
  ]),
  PLATFORM_SUPPORT: new Set<string>([Permission.TENANT_MANAGE]),

  // Tenant scope
  TENANT_OWNER: new Set<string>([
    Permission.SETTINGS_WRITE,
    Permission.PRODUCT_WRITE,
    Permission.PRODUCT_DELETE,
    Permission.CATEGORY_WRITE,
    Permission.CATEGORY_DELETE,
    Permission.BRAND_WRITE,
    Permission.BRAND_DELETE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_WRITE,
    Permission.ORDER_READ,
    Permission.ORDER_WRITE,
  ]),
  TENANT_ADMIN: new Set<string>([
    Permission.SETTINGS_WRITE,
    Permission.PRODUCT_WRITE,
    Permission.PRODUCT_DELETE,
    Permission.CATEGORY_WRITE,
    Permission.CATEGORY_DELETE,
    Permission.BRAND_WRITE,
    Permission.BRAND_DELETE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_WRITE,
    Permission.ORDER_READ,
    Permission.ORDER_WRITE,
  ]),
  STAFF: new Set<string>([
    Permission.PRODUCT_WRITE,
    Permission.CATEGORY_WRITE,
    Permission.BRAND_WRITE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_WRITE,
    Permission.ORDER_READ,
    Permission.ORDER_WRITE,
  ]),

  // Customer scope
  CUSTOMER: new Set<string>([]),
};

export function roleHasPermission(role: string, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
