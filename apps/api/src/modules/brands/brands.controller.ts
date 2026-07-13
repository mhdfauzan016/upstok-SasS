import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  /** GET /brands — public, tenant-scoped (storefront filter). */
  @Public()
  @Get()
  list(@CurrentTenant() tenant: TenantContext) {
    return this.brands.list(tenant.tenantId);
  }

  /** POST /brands — create (console). */
  @Post()
  @RequirePermission(Permission.BRAND_WRITE)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateBrandDto,
  ) {
    return this.brands.create(tenant.tenantId, dto, actor);
  }

  /** PATCH /brands/:id — update (console). */
  @Patch(':id')
  @RequirePermission(Permission.BRAND_WRITE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brands.update(tenant.tenantId, id, dto, actor);
  }

  /** DELETE /brands/:id — soft delete (console). */
  @Delete(':id')
  @RequirePermission(Permission.BRAND_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.brands.remove(tenant.tenantId, id, actor);
  }
}
