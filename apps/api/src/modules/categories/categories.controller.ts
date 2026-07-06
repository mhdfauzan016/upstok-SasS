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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** GET /categories — public, tenant-scoped (storefront nav). */
  @Public()
  @Get()
  list(@CurrentTenant() tenant: TenantContext) {
    return this.categories.list(tenant.tenantId);
  }

  /** POST /categories — create (console). */
  @Post()
  @RequirePermission(Permission.CATEGORY_WRITE)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categories.create(tenant.tenantId, dto, actor);
  }

  /** PATCH /categories/:id — update (console). */
  @Patch(':id')
  @RequirePermission(Permission.CATEGORY_WRITE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(tenant.tenantId, id, dto, actor);
  }

  /** DELETE /categories/:id — soft delete (console). */
  @Delete(':id')
  @RequirePermission(Permission.CATEGORY_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.categories.remove(tenant.tenantId, id, actor);
  }
}
