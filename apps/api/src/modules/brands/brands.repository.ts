import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

const BRAND_SELECT = {
  id: true,
  name: true,
  slug: true,
  position: true,
  _count: { select: { products: { where: { deletedAt: null } } } },
} satisfies Prisma.BrandSelect;

export interface CreateBrandParams {
  tenantId: string;
  name: string;
  slug: string;
  position: number;
}

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByTenant(tenantId: string) {
    return this.prisma.brand.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: BRAND_SELECT,
    });
  }

  findByIdInTenant(tenantId: string, id: string) {
    return this.prisma.brand.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: BRAND_SELECT,
    });
  }

  /** Uniqueness check for (tenantId, slug). */
  async slugTaken(
    tenantId: string,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const found = await this.prisma.brand.findFirst({
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

  create(params: CreateBrandParams) {
    return this.prisma.brand.create({
      data: {
        tenantId: params.tenantId,
        name: params.name,
        slug: params.slug,
        position: params.position,
      },
      select: BRAND_SELECT,
    });
  }

  update(id: string, data: Prisma.BrandUpdateInput) {
    return this.prisma.brand.update({
      where: { id },
      data,
      select: BRAND_SELECT,
    });
  }

  /**
   * Soft-delete the brand in a transaction, detaching products (brandId → null)
   * so no row points at a deleted brand.
   */
  softDelete(tenantId: string, id: string) {
    return this.prisma.$transaction([
      this.prisma.product.updateMany({
        where: { tenantId, brandId: id },
        data: { brandId: null },
      }),
      this.prisma.brand.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true },
      }),
    ]);
  }
}
