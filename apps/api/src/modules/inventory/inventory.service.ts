import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { AdjustStockDto, AdjustmentType } from './dto/adjust-stock.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import {
  InventoryItemView,
  PaginatedResult,
  StockMovementView,
} from './entities/inventory.entity';
import { InventoryRepository } from './inventory.repository';

type ItemRow = NonNullable<
  Awaited<ReturnType<InventoryRepository['findItemByProductId']>>
>;
type MovementRow = Awaited<
  ReturnType<InventoryRepository['listMovementsAndCount']>
>['rows'][number];

@Injectable()
export class InventoryService {
  constructor(
    private readonly repo: InventoryRepository,
    private readonly audit: AuditService,
  ) {}

  /** GET /inventory — console stock list. */
  async list(
    tenantId: string,
    query: ListInventoryQueryDto,
  ): Promise<PaginatedResult<InventoryItemView>> {
    const { rows, total } = await this.repo.listAndCount({
      tenantId,
      search: query.search,
      lowStockOnly: query.lowStock === 'true',
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: rows.map((r) => this.toItemView(r)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  /** GET /inventory/:productId — single product's stock. */
  async getByProductId(
    tenantId: string,
    productId: string,
  ): Promise<InventoryItemView> {
    const item = await this.repo.findItemByProductId(tenantId, productId);
    if (!item) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'inventory item not found',
      });
    }
    return this.toItemView(item);
  }

  /** GET /inventory/alerts/low-stock — items needing a restock. */
  async listLowStock(tenantId: string): Promise<InventoryItemView[]> {
    const { rows } = await this.repo.listAndCount({
      tenantId,
      lowStockOnly: true,
      skip: 0,
      take: 100,
    });
    return rows.map((r) => this.toItemView(r));
  }

  /** POST /inventory/:productId/adjust — apply a signed stock delta. */
  async adjust(
    tenantId: string,
    productId: string,
    dto: AdjustStockDto,
    actor: AuthUser,
  ): Promise<InventoryItemView> {
    if (dto.quantityChange === 0) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'quantityChange must not be zero',
      });
    }

    const item = await this.repo.findItemByProductId(tenantId, productId);
    if (!item) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'inventory item not found',
      });
    }

    const quantityAfter = item.quantityOnHand + dto.quantityChange;
    if (quantityAfter < 0) {
      throw new UnprocessableEntityException({
        code: 'INSUFFICIENT_STOCK',
        message: 'adjustment would drive stock below zero',
        details: {
          quantityOnHand: item.quantityOnHand,
          quantityChange: dto.quantityChange,
        },
      });
    }

    const type = this.resolveType(dto);
    const updated = await this.repo.applyMovement({
      tenantId,
      inventoryItemId: item.id,
      type,
      quantityChange: dto.quantityChange,
      quantityAfter,
      note: dto.note,
      actorId: actor.id,
    });

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'inventory.adjusted',
      targetType: 'product',
      targetId: productId,
      metadata: { type, quantityChange: dto.quantityChange, quantityAfter },
    });

    return this.toItemView(updated);
  }

  /** PATCH /inventory/:productId — update the low-stock threshold. */
  async updateSettings(
    tenantId: string,
    productId: string,
    dto: UpdateInventoryDto,
    actor: AuthUser,
  ): Promise<InventoryItemView> {
    const item = await this.repo.findItemByProductId(tenantId, productId);
    if (!item) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'inventory item not found',
      });
    }

    const updated = await this.repo.updateThreshold(
      item.id,
      dto.lowStockThreshold,
    );

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'inventory.settings_updated',
      targetType: 'product',
      targetId: productId,
      metadata: { lowStockThreshold: dto.lowStockThreshold },
    });

    return this.toItemView(updated);
  }

  /** GET /inventory/:productId/movements — the ledger. */
  async listMovements(
    tenantId: string,
    productId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<StockMovementView>> {
    const item = await this.repo.findItemByProductId(tenantId, productId);
    if (!item) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'inventory item not found',
      });
    }

    const { rows, total } = await this.repo.listMovementsAndCount(
      tenantId,
      item.id,
      (page - 1) * limit,
      limit,
    );

    return {
      data: rows.map((r) => this.toMovementView(r)),
      meta: { page, limit, total },
    };
  }

  // ---- helpers ----

  private resolveType(dto: AdjustStockDto): MovementType {
    if (dto.type) return dto.type as unknown as MovementType;
    // Infer a sensible default from the sign when the caller omits the type.
    return (
      dto.quantityChange > 0 ? AdjustmentType.RESTOCK : AdjustmentType.ADJUSTMENT
    ) as unknown as MovementType;
  }

  private toItemView(row: ItemRow): InventoryItemView {
    const available = Math.max(0, row.quantityOnHand - row.reservedQuantity);
    return {
      productId: row.productId,
      productName: row.product.name,
      sku: row.product.sku,
      quantityOnHand: row.quantityOnHand,
      reservedQuantity: row.reservedQuantity,
      quantityAvailable: available,
      lowStockThreshold: row.lowStockThreshold,
      lowStock:
        row.lowStockThreshold > 0 &&
        row.quantityOnHand <= row.lowStockThreshold,
      updatedAt: row.updatedAt,
    };
  }

  private toMovementView(row: MovementRow): StockMovementView {
    return {
      id: row.id,
      type: row.type,
      quantityChange: row.quantityChange,
      quantityAfter: row.quantityAfter,
      note: row.note ?? null,
      actorId: row.actorId ?? null,
      createdAt: row.createdAt,
    };
  }
}
