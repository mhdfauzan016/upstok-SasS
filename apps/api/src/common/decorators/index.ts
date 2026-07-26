import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Permission } from '../constants/permissions';

/** Marks a route as not requiring authentication (AuthGuard short-circuits). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Declares the permission required to invoke a route (checked by RbacGuard). */
export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

/** The authenticated principal, attached to the request by the AuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  scope: 'platform' | 'tenant' | 'customer';
  tenantId: string | null;
}

/** Injects the authenticated principal into a handler argument. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);

/** Resolved tenant context for the request (set by the tenant resolver middleware). */
export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  status: string;
}

/**
 * Injects the resolved tenant context into a handler argument.
 *
 * Every route that injects this requires a tenant, so if the resolver
 * middleware attached none (no `X-Tenant-Slug` header and no tenant subdomain —
 * e.g. the API host hit directly), fail with a clear 400 instead of letting the
 * handler dereference `undefined` and crash with a raw 500.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const tenant: TenantContext | undefined =
      ctx.switchToHttp().getRequest().tenant;
    if (!tenant) {
      throw new BadRequestException({
        code: 'TENANT_REQUIRED',
        message:
          'no tenant resolved for this request (missing X-Tenant-Slug header or tenant subdomain)',
      });
    }
    return tenant;
  },
);
