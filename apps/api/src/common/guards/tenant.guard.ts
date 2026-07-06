import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser, TenantContext } from '../decorators';

/**
 * Step 2 of the guard chain — tenant isolation, enforced independently of role.
 * - Public requests (no authenticated user) pass; tenant-scoped reads are
 *   validated by the service layer / Prisma scoping.
 * - Platform-scoped principals are not tenant-bound (they reach tenant data
 *   only via explicit platform routes).
 * - Tenant/customer principals MUST match the request's resolved tenant, and
 *   that tenant must be active.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    const tenant: TenantContext | undefined = req.tenant;

    if (!user) return true; // public route
    if (user.scope === 'platform') return true;

    if (!tenant || user.tenantId !== tenant.tenantId) {
      throw new ForbiddenException({
        code: 'TENANT_MISMATCH',
        message: 'token does not belong to this tenant',
      });
    }

    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      throw new ForbiddenException({
        code: 'TENANT_SUSPENDED',
        message: 'this tenant is currently unavailable',
      });
    }

    return true;
  }
}
