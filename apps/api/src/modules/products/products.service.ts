import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  PaginatedResult,
  ProductAdminView,
  ProductDetail,
  ProductListItem,
} from './entities/product.entity';
import { ProductsRepository } from './products.repository';

type ProductRow = NonNullable<
  Awaited<ReturnType<ProductsRepository['findByIdInTenant']>>
>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly audit: AuditService,
  ) {}

  /** GET /products — public catalog. */
  async listPublic(
    tenantId: string,
    query: ListProductsQueryDto,
  ): Promise<PaginatedResult<ProductListItem>> {
    const { rows, total } = await this.repo.listPublicAndCount({
      tenantId,
      categoryId: query.categoryId,
      brandId: query.brandId,
      search: query.search,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: rows.map((r) => this.toListItem(r)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  /** GET /products/:slug — public detail. */
  async getPublicBySlug(
    tenantId: string,
    slug: string,
  ): Promise<ProductDetail> {
    const product = await this.repo.findPublicBySlug(tenantId, slug);
    if (!product) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'product not found',
      });
    }
    return this.toDetail(product);
  }

  /** POST /products — create (console). Enforces plan product limit. */
  async create(
    tenantId: string,
    dto: CreateProductDto,
    actor: AuthUser,
  ): Promise<ProductAdminView> {
    const limit = await this.repo.getProductLimit(tenantId);
    if (limit !== null) {
      const count = await this.repo.countByTenant(tenantId);
      if (count >= limit) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `product limit (${limit}) reached for current plan`,
        });
      }
    }

    if (dto.categoryId) {
      await this.assertCategory(tenantId, dto.categoryId);
    }
    if (dto.brandId) {
      await this.assertBrand(tenantId, dto.brandId);
    }

    const slug = (dto.slug ?? this.slugify(dto.name)).toLowerCase();
    if (await this.repo.slugExists(tenantId, slug)) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'slug is already in use',
        details: { slug },
      });
    }
    if (await this.repo.skuExists(tenantId, dto.sku)) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'sku is already in use',
        details: { sku: dto.sku },
      });
    }

    let product: ProductRow;
    try {
      product = await this.repo.create({
        tenantId,
        name: dto.name,
        slug,
        sku: dto.sku,
        description: dto.description,
        priceAmount: dto.price.amount,
        currency: dto.price.currency.toUpperCase(),
        images: dto.images ?? [],
        colors: dto.colors ?? [],
        sizes: dto.sizes ?? [],
        status: (dto.status ?? 'draft') as ProductStatus,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
      });
    } catch (err) {
      throw this.mapUniqueViolation(err, slug, dto.sku);
    }

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'product.created',
      targetType: 'product',
      targetId: product.id,
      metadata: { slug, sku: dto.sku },
    });

    return this.toAdminView(product);
  }

  /** PATCH /products/:id — update (console). */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
    actor: AuthUser,
  ): Promise<ProductAdminView> {
    if (Object.keys(dto).length === 0) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'at least one field must be provided',
      });
    }

    const existing = await this.repo.findByIdInTenant(tenantId, id);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'product not found',
      });
    }

    if (dto.categoryId) {
      await this.assertCategory(tenantId, dto.categoryId);
    }
    if (dto.brandId) {
      await this.assertBrand(tenantId, dto.brandId);
    }
    if (dto.sku && (await this.repo.skuExists(tenantId, dto.sku, id))) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'sku is already in use',
        details: { sku: dto.sku },
      });
    }

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.colors !== undefined) data.colors = dto.colors;
    if (dto.sizes !== undefined) data.sizes = dto.sizes;
    if (dto.status !== undefined) data.status = dto.status as ProductStatus;
    if (dto.price !== undefined) {
      data.priceAmount = dto.price.amount;
      data.currency = dto.price.currency.toUpperCase();
    }
    if (dto.categoryId !== undefined) {
      data.category =
        dto.categoryId === null
          ? { disconnect: true }
          : { connect: { id: dto.categoryId } };
    }
    if (dto.brandId !== undefined) {
      data.brand =
        dto.brandId === null
          ? { disconnect: true }
          : { connect: { id: dto.brandId } };
    }

    let updated: ProductRow;
    try {
      updated = await this.repo.update(id, data);
    } catch (err) {
      throw this.mapUniqueViolation(err, existing.slug, dto.sku);
    }

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'product.updated',
      targetType: 'product',
      targetId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toAdminView(updated);
  }

  /** DELETE /products/:id — soft delete (console). */
  async remove(tenantId: string, id: string, actor: AuthUser): Promise<void> {
    const existing = await this.repo.findByIdInTenant(tenantId, id);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'product not found',
      });
    }

    await this.repo.softDelete(id);
    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'product.deleted',
      targetType: 'product',
      targetId: id,
    });
  }

  // ---- helpers ----

  private async assertCategory(tenantId: string, categoryId: string) {
    const category = await this.repo.findCategoryInTenant(tenantId, categoryId);
    if (!category) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'categoryId does not belong to this tenant',
        details: { categoryId },
      });
    }
  }

  private async assertBrand(tenantId: string, brandId: string) {
    const brand = await this.repo.findBrandInTenant(tenantId, brandId);
    if (!brand) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'brandId does not belong to this tenant',
        details: { brandId },
      });
    }
  }

  private mapUniqueViolation(err: unknown, slug: string, sku?: string) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new ConflictException({
        code: 'CONFLICT',
        message: 'slug or sku is already in use',
        details: { slug, sku },
      });
    }
    return err;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  private toListItem(row: ProductRow): ProductListItem {
    const stock = row.inventory?.quantityOnHand ?? 0;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      price: { amount: row.priceAmount, currency: row.currency },
      images: (row.images as string[]) ?? [],
      colors: (row.colors as string[]) ?? [],
      sizes: (row.sizes as string[]) ?? [],
      category: row.category
        ? { id: row.category.id, name: row.category.name }
        : null,
      brand: row.brand ? { id: row.brand.id, name: row.brand.name } : null,
      status: row.status,
      stock,
      available: stock > 0,
    };
  }

  private toDetail(row: ProductRow): ProductDetail {
    return {
      ...this.toListItem(row),
      description: row.description ?? null,
      quantityAvailable: row.inventory?.quantityOnHand ?? 0,
    };
  }

  private toAdminView(row: ProductRow): ProductAdminView {
    return {
      ...this.toDetail(row),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
