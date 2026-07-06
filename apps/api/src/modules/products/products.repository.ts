import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true } },
  inventory: { select: { quantityOnHand: true } },
} satisfies Prisma.ProductInclude;

export interface CreateProductParams {
  tenantId: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  priceAmount: number;
  currency: string;
  images: string[];
  colors: string[];
  sizes: string[];
  status: ProductStatus;
  categoryId?: string;
}

export interface ListPublicParams {
  tenantId: string;
  categoryId?: string;
  search?: string;
  skip: number;
  take: number;
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active (non-deleted) product count — used for plan-limit enforcement. */
  countByTenant(tenantId: string): Promise<number> {
    return this.prisma.product.count({
      where: { tenantId, deletedAt: null },
    });
  }

  /** Plan's max_products for the tenant (null = unlimited / no subscription). */
  async getProductLimit(tenantId: string): Promise<number | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { maxProducts: true } } },
    });
    return sub?.plan?.maxProducts ?? null;
  }

  findCategoryInTenant(tenantId: string, categoryId: string) {
    return this.prisma.category.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }

  async skuExists(
    tenantId: string,
    sku: string,
    excludeId?: string,
  ): Promise<boolean> {
    const found = await this.prisma.product.findFirst({
      where: {
        tenantId,
        sku,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  async slugExists(
    tenantId: string,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const found = await this.prisma.product.findFirst({
      where: {
        tenantId,
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  /** Create product + its 1:1 inventory item in one transaction. */
  create(params: CreateProductParams) {
    return this.prisma.product.create({
      data: {
        tenantId: params.tenantId,
        name: params.name,
        slug: params.slug,
        sku: params.sku,
        description: params.description,
        priceAmount: params.priceAmount,
        currency: params.currency,
        images: params.images,
        colors: params.colors,
        sizes: params.sizes,
        status: params.status,
        categoryId: params.categoryId,
        inventory: { create: { tenantId: params.tenantId } },
      },
      include: PRODUCT_INCLUDE,
    });
  }

  findByIdInTenant(tenantId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
  }

  findPublicBySlug(tenantId: string, slug: string) {
    return this.prisma.product.findFirst({
      where: { tenantId, slug, status: 'active', deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: PRODUCT_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async listPublicAndCount(params: ListPublicParams) {
    const where: Prisma.ProductWhereInput = {
      tenantId: params.tenantId,
      status: 'active',
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? { name: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { rows, total };
  }
}
