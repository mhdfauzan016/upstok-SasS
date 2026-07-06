import { Injectable } from '@nestjs/common';

/**
 * Caches slug → { tenantId, status } so the tenant resolver middleware avoids a
 * DB hit per request. Backed by Redis in production; the interface is what the
 * Tenant module depends on. Mutations to a tenant (profile, status) MUST call
 * invalidate() so the resolver never serves stale status (e.g. a suspended
 * tenant that still resolves as active).
 */
@Injectable()
export class TenantCacheService {
  // Replace the Map with a Redis-backed store in production wiring.
  private readonly store = new Map<string, { tenantId: string; status: string }>();

  async get(slug: string): Promise<{ tenantId: string; status: string } | null> {
    return this.store.get(slug) ?? null;
  }

  async set(
    slug: string,
    value: { tenantId: string; status: string },
  ): Promise<void> {
    this.store.set(slug, value);
  }

  async invalidate(slug: string): Promise<void> {
    this.store.delete(slug);
  }
}
