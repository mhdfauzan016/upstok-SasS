import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { TenantCacheService } from './cache/tenant-cache.service';

/**
 * App-wide singletons. Global so the SAME TenantCacheService instance is shared
 * between the tenant-resolver middleware and the services that invalidate it,
 * and AuditService is available to every module without re-providing it.
 */
@Global()
@Module({
  providers: [AuditService, TenantCacheService],
  exports: [AuditService, TenantCacheService],
})
export class SharedModule {}
