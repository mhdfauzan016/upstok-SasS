import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  Public,
  RequirePermission,
  TenantContext,
} from '../../common/decorators';
import { Permission } from '../../common/constants/permissions';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

/**
 * Tenant self-service surface: /tenants (public signup), /tenant (console),
 * /tenant/branding (public storefront theming).
 *
 * Guard chain (global): AuthGuard -> TenantGuard -> RbacGuard.
 * - @Public() bypasses AuthGuard.
 * - @RequirePermission() is enforced by RbacGuard against the actor's role.
 */
@Controller()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  /** POST /tenants — public self-signup. */
  @Public()
  @Post('tenants')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  /** GET /tenant — current tenant profile (tenant console). */
  @Get('tenant')
  getProfile(@CurrentTenant() tenant: TenantContext) {
    return this.tenants.getProfile(tenant.tenantId);
  }

  /** PATCH /tenant — update current tenant profile/branding. */
  @Patch('tenant')
  @RequirePermission(Permission.SETTINGS_WRITE)
  updateProfile(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenants.updateProfile(
      tenant.tenantId,
      tenant.tenantSlug,
      dto,
      actor,
    );
  }

  /** GET /tenant/branding — public storefront theming. */
  @Public()
  @Get('tenant/branding')
  getBranding(@CurrentTenant() tenant: TenantContext) {
    return this.tenants.getPublicBranding(tenant.tenantSlug);
  }
}

/** Platform-admin surface for managing tenants across the platform. */
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly tenants: TenantsService) {}

  /** GET /platform/tenants — list/filter tenants. */
  @Get()
  @RequirePermission(Permission.TENANT_MANAGE)
  list(@Query() query: ListTenantsQueryDto) {
    return this.tenants.list(query);
  }

  /** PATCH /platform/tenants/:tenantId/status — suspend/activate/cancel. */
  @Patch(':tenantId/status')
  @RequirePermission(Permission.TENANT_SUSPEND)
  updateStatus(
    @Param('tenantId', new ParseUUIDPipe()) tenantId: string,
    @CurrentUser() actor: AuthUser,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.tenants.updateStatus(tenantId, dto, actor);
  }
}
