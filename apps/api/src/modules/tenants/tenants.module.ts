import { Module } from '@nestjs/common';
import {
  PlatformTenantsController,
  TenantsController,
} from './tenants.controller';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';

// AuditService + TenantCacheService are provided globally by SharedModule.
@Module({
  controllers: [TenantsController, PlatformTenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
