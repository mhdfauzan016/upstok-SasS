import { Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

const ITEM_INCLUDE = {
  product: { select: { name: true, sku: true, deletedAt: true } },
} satisfies Prisma.InventoryItemInclude;

export interface ListItemsParams {
  tenantId: string;
  search?: string;
  lowStockOnly: boolean;
  skip: number;
  take: number;
}

export interface ApplyMovementParams {
  tenantId: string;
  inventoryItemId: string;
  type: MovementType;
  quantityChange: number;
  quantityAfter: number;
  note?: string;
  actorId: string | null;
}

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The product's inventory item (with product name/sku), tenant-scoped. */
  findItemByProductId(tenantId: string, productId: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { tenantId, productId, product: { deletedAt: null } },
      include: ITEM_INCLUDE,
    });
  }

  findItemById(tenantId: string, id: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: ITEM_INCLUDE,
    });
  }

  async listAndCount(params: ListItemsParams) {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId: params.tenantId,
      product: {
        deletedAt: null,
        ...(params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { sku: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      // quantityOnHand <= lowStockThreshold (threshold > 0). Prisma cannot
      // compare two columns, so the threshold check is expressed via raw SQL
      // in `listLowStockIds` and intersected here when lowStockOnly is set.
      ...(params.lowStockOnly
        ? { id: { in: await this.listLowStockIds(params.tenantId) } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: ITEM_INCLUDE,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return { rows, total };
  }

  /** IDs of items at/below their (non-zero) low-stock threshold. */
  async listLowStockIds(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM inventory_items
      WHERE tenant_id = ${tenantId}::uuid
        AND low_stock_threshold > 0
        AND quantity_on_hand <= low_stock_threshold
    `;
    return rows.map((r) => r.id);
  }

  updateThreshold(id: string, lowStockThreshold: number) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { lowStockThreshold },
      include: ITEM_INCLUDE,
    });
  }

  /**
   * Apply a signed stock delta and append a ledger entry atomically. The new
   * on-hand value is computed by the caller and written here in one
   * transaction so the running balance in the ledger never diverges.
   */
  async applyMovement(params: ApplyMovementParams) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id: params.inventoryItemId },
        data: { quantityOnHand: params.quantityAfter },
        include: ITEM_INCLUDE,
      });
      await tx.stockMovement.create({
        data: {
          tenantId: params.tenantId,
          inventoryItemId: params.inventoryItemId,
          type: params.type,
          quantityChange: params.quantityChange,
          quantityAfter: params.quantityAfter,
          note: params.note,
          actorId: params.actorId,
        },
      });
      return item;
    });
  }

  async listMovementsAndCount(
    tenantId: string,
    inventoryItemId: string,
    skip: number,
    take: number,
  ) {
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      inventoryItemId,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { rows, total };
  }
}
