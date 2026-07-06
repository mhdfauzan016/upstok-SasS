import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  position: true,
  _count: { select: { products: { where: { deletedAt: null } } } },
} satisfies Prisma.CategorySelect;

export interface CreateCategoryParams {
  tenantId: string;
  name: string;
  slug: string;
  parentId?: string;
  position: number;
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByTenant(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: CATEGORY_SELECT,
    });
  }

  findByIdInTenant(tenantId: string, id: string) {
    return this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: CATEGORY_SELECT,
    });
  }

  /** Uniqueness check for (tenantId, parentId, slug); parentId may be null (root). */
  async slugTakenUnderParent(
    tenantId: string,
    parentId: string | null,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const found = await this.prisma.category.findFirst({
      where: {
        tenantId,
        parentId,
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  create(params: CreateCategoryParams) {
    return this.prisma.category.create({
      data: {
        tenantId: params.tenantId,
        name: params.name,
        slug: params.slug,
        parentId: params.parentId,
        position: params.position,
      },
      select: CATEGORY_SELECT,
    });
  }

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({
      where: { id },
      data,
      select: CATEGORY_SELECT,
    });
  }

  /**
   * Soft-delete the category in a transaction, re-parenting its direct children
   * to root and detaching products (categoryId → null) so no row points at a
   * deleted category.
   */
  softDelete(tenantId: string, id: string) {
    return this.prisma.$transaction([
      this.prisma.product.updateMany({
        where: { tenantId, categoryId: id },
        data: { categoryId: null },
      }),
      this.prisma.category.updateMany({
        where: { tenantId, parentId: id },
        data: { parentId: null },
      }),
      this.prisma.category.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true },
      }),
    ]);
  }
}
