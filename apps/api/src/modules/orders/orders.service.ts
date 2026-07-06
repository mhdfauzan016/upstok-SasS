import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  OrderDetail,
  OrderListItem,
  PaginatedResult,
} from './entities/order.entity';
import { OrdersRepository } from './orders.repository';

type OrderRow = NonNullable<
  Awaited<ReturnType<OrdersRepository['findByIdInTenant']>>
>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly audit: AuditService,
  ) {}

  /** POST /orders — guest/customer checkout with transactional stock decrement. */
  async create(tenantId: string, dto: CreateOrderDto): Promise<OrderDetail> {
    // Collapse duplicate productIds into summed quantities.
    const wanted = new Map<string, number>();
    for (const item of dto.items) {
      wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
    }
    const productIds = [...wanted.keys()];

    const products = await this.repo.findActiveProducts(tenantId, productIds);
    if (products.length !== productIds.length) {
      const found = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !found.has(id));
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'one or more products are unavailable',
        details: { productIds: missing },
      });
    }

    await this.assertOrderLimit(tenantId);

    const currency = products[0].currency;
    let subtotal = 0;
    const lines = products.map((p) => {
      const quantity = wanted.get(p.id)!;
      const lineTotal = p.priceAmount * quantity;
      subtotal += lineTotal;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        unitPriceAmount: p.priceAmount,
        quantity,
        lineTotalAmount: lineTotal,
      };
    });

    const orderNumber = this.generateOrderNumber();
    let order: OrderRow;
    try {
      order = (await this.repo.createWithStockDecrement({
        tenantId,
        orderNumber,
        customer: dto.customer,
        currency,
        subtotalAmount: subtotal,
        totalAmount: subtotal,
        lines,
      })) as OrderRow;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // Extremely rare orderNumber collision — surface as a retryable conflict.
        throw new UnprocessableEntityException({
          code: 'CONFLICT',
          message: 'could not allocate an order number, please retry',
        });
      }
      throw err;
    }

    await this.audit.record({
      tenantId,
      actorId: null,
      actorScope: 'customer',
      action: 'order.created',
      targetType: 'order',
      targetId: order.id,
      metadata: { orderNumber, total: subtotal, items: lines.length },
    });

    return this.toDetail(order);
  }

  /** GET /orders — console list. */
  async list(
    tenantId: string,
    query: ListOrdersQueryDto,
  ): Promise<PaginatedResult<OrderListItem>> {
    const { rows, total } = await this.repo.listAndCount({
      tenantId,
      status: query.status as OrderStatus | undefined,
      search: query.search,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: rows.map((r) => this.toListItem(r)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  /** GET /orders/:id — console detail. */
  async getById(tenantId: string, id: string): Promise<OrderDetail> {
    const order = await this.repo.findByIdInTenant(tenantId, id);
    if (!order) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'order not found',
      });
    }
    return this.toDetail(order);
  }

  /** PATCH /orders/:id/status — advance lifecycle; cancel restocks. */
  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateOrderStatusDto,
    actor: AuthUser,
  ): Promise<OrderDetail> {
    const existing = await this.repo.findByIdInTenant(tenantId, id);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'order not found',
      });
    }

    const target = dto.status as OrderStatus;
    if (existing.status === 'cancelled' && target !== 'cancelled') {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'a cancelled order cannot be reactivated',
      });
    }

    let updated: OrderRow;
    if (target === 'cancelled' && existing.status !== 'cancelled') {
      updated = (await this.repo.cancelAndRestock(tenantId, id)) as OrderRow;
    } else {
      updated = (await this.repo.updateStatus(id, target)) as OrderRow;
    }

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'order.status_changed',
      targetType: 'order',
      targetId: id,
      metadata: { from: existing.status, to: target },
    });

    return this.toDetail(updated);
  }

  // ---- helpers ----

  private async assertOrderLimit(tenantId: string): Promise<void> {
    const limit = await this.repo.getOrderLimit(tenantId);
    if (limit === null) return;
    const startOfMonth = this.startOfCurrentMonth();
    const count = await this.repo.countSince(tenantId, startOfMonth);
    if (count >= limit) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_EXCEEDED',
        message: `monthly order limit (${limit}) reached for current plan`,
      });
    }
  }

  private startOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const suffix = String(Math.floor(Math.random() * 900000) + 100000);
    return `ORD-${date}-${suffix}`;
  }

  private toListItem(row: OrderRow): OrderListItem {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      customer: {
        name: row.customerName,
        phone: row.customerPhone,
        address: row.customerAddress,
        notes: row.notes ?? null,
      },
      subtotal: { amount: row.subtotalAmount, currency: row.currency },
      total: { amount: row.totalAmount, currency: row.currency },
      itemCount: row._count.items,
      createdAt: row.createdAt,
    };
  }

  private toDetail(row: OrderRow): OrderDetail {
    return {
      ...this.toListItem(row),
      items: row.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        unitPrice: { amount: it.unitPriceAmount, currency: row.currency },
        quantity: it.quantity,
        lineTotal: { amount: it.lineTotalAmount, currency: row.currency },
      })),
    };
  }
}
