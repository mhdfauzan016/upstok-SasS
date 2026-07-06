import {
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

/** Injects the resolved tenant context into a handler argument. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    return ctx.switchToHttp().getRequest().tenant;
  },
);
