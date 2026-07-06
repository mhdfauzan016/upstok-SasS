import {
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantCacheService } from '../../shared/cache/tenant-cache.service';

const RESERVED = new Set([
  'www',
  'admin',
  'api',
  'app',
  'mail',
  'localhost',
]);

/**
 * Resolves the tenant for the request and attaches it as `req.tenant`.
 *
 * Source of the slug, in priority order:
 *   1. `X-Tenant-Slug` header (sent by the web app)
 *   2. the host subdomain ({tenant}.upstock.my.id / {tenant}.lvh.me)
 *
 * Platform/admin/apex hosts resolve to no tenant (req.tenant stays undefined) —
 * those routes are either @Public or platform-scoped. A slug that is present
 * but doesn't exist yields 404 TENANT_NOT_FOUND so tenant-scoped routes never
 * silently run without a tenant. Suspended tenants are still attached; the
 * TenantGuard / service layer decides what to do with them.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: TenantCacheService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const slug = this.extractSlug(req);
    if (!slug) return next();

    let entry = await this.cache.get(slug);
    if (!entry) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!tenant) {
        throw new NotFoundException({
          code: 'TENANT_NOT_FOUND',
          message: 'tenant not found',
        });
      }
      entry = { tenantId: tenant.id, status: tenant.status };
      await this.cache.set(slug, entry);
    }

    (req as Request & { tenant?: unknown }).tenant = {
      tenantId: entry.tenantId,
      tenantSlug: slug,
      status: entry.status,
    };
    next();
  }

  private extractSlug(req: Request): string | null {
    const header = req.headers['x-tenant-slug'];
    if (typeof header === 'string' && header.trim()) {
      const s = header.trim().toLowerCase();
      return RESERVED.has(s) ? null : s;
    }

    const host = (req.headers.host ?? '').split(':')[0];
    const labels = host.split('.');
    if (labels.length < 2) return null; // bare host / localhost
    const candidate = labels[0].toLowerCase();
    return RESERVED.has(candidate) ? null : candidate;
  }
}
