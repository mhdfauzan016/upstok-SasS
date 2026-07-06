import {
  BadRequestException,
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
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  Public,
  RequirePermission,
  TenantContext,
} from '../../common/decorators';
import { Permission } from '../../common/constants/permissions';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import {
  buildProductImageUrl,
  productImageMulterOptions,
} from './products.upload';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** GET /products — public catalog (active products only). */
  @Public()
  @Get()
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.products.listPublic(tenant.tenantId, query);
  }

  /** GET /products/:slug — public detail. */
  @Public()
  @Get(':slug')
  detail(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
  ) {
    return this.products.getPublicBySlug(tenant.tenantId, slug);
  }

  /**
   * POST /products/uploads — upload a single product image (console).
   * Returns `{ url }`; the client includes returned URLs in the product's
   * `images` array on create/update.
   */
  @Post('uploads')
  @RequirePermission(Permission.PRODUCT_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', productImageMulterOptions))
  uploadImage(
    @CurrentTenant() tenant: TenantContext,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'no file provided (expected multipart field "file")',
      });
    }
    return { url: buildProductImageUrl(req, tenant.tenantId, file.filename) };
  }

  /** POST /products — create (console). */
  @Post()
  @RequirePermission(Permission.PRODUCT_WRITE)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(tenant.tenantId, dto, actor);
  }

  /** PATCH /products/:id — update (console). */
  @Patch(':id')
  @RequirePermission(Permission.PRODUCT_WRITE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(tenant.tenantId, id, dto, actor);
  }

  /** DELETE /products/:id — soft delete (console). */
  @Delete(':id')
  @RequirePermission(Permission.PRODUCT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.products.remove(tenant.tenantId, id, actor);
  }
}
