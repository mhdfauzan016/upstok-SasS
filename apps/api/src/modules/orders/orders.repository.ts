import { ConflictException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

const ORDER_INCLUDE = {
  items: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

export interface OrderLineParams {
  productId: string;
  productName: string;
  sku: string;
  unitPriceAmount: number;
  quantity: number;
  lineTotalAmount: number;
}

export interface CreateOrderParams {
  tenantId: string;
  orderNumber: string;
  customer: { name: string; phone: string; address: string; notes?: string };
  currency: string;
  subtotalAmount: number;
  totalAmount: number;
  lines: OrderLineParams[];
}

export interface ListOrdersParams {
  tenantId: string;
  status?: OrderStatus;
  search?: string;
  skip: number;
  take: number;
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active, non-deleted products for the given ids — for price/name snapshot. */
  findActiveProducts(tenantId: string, productIds: string[]) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        id: { in: productIds },
        status: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        priceAmount: true,
        currency: true,
      },
    });
  }

  /** Plan's max_orders_per_month for the tenant (null = unlimited). */
  async getOrderLimit(tenantId: string): Promise<number | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { maxOrdersPerMonth: true } } },
    });
    return sub?.plan?.maxOrdersPerMonth ?? null;
  }

  /** Orders placed since the start of the current month (for plan limits). */
  countSince(tenantId: string, since: Date): Promise<number> {
    return this.prisma.order.count({
      where: { tenantId, createdAt: { gte: since } },
    });
  }

  /**
   * Create the order and decrement stock atomically. For each line we issue a
   * guarded `updateMany` (quantityOnHand >= qty); a row count of 0 means the
   * stock check lost a race or never had enough, so we throw and the whole
   * transaction — order, movements, every prior decrement — rolls back.
   */
  createWithStockDecrement(params: CreateOrderParams) {
    return this.prisma.$transaction(async (tx) => {
      for (const line of params.lines) {
        const res = await tx.inventoryItem.updateMany({
          where: {
            tenantId: params.tenantId,
            productId: line.productId,
            quantityOnHand: { gte: line.quantity },
          },
          data: { quantityOnHand: { decrement: line.quantity } },
        });
        if (res.count !== 1) {
          throw new ConflictException({
            code: 'INSUFFICIENT_STOCK',
            message: `insufficient stock for "${line.productName}"`,
            details: { productId: line.productId, requested: line.quantity },
          });
        }

        const item = await tx.inventoryItem.findFirstOrThrow({
          where: { tenantId: params.tenantId, productId: line.productId },
          select: { id: true, quantityOnHand: true },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: params.tenantId,
            inventoryItemId: item.id,
            type: 'sale',
            quantityChange: -line.quantity,
            quantityAfter: item.quantityOnHand,
            note: `order ${params.orderNumber}`,
          },
        });
      }

      return tx.order.create({
        data: {
          tenantId: params.tenantId,
          orderNumber: params.orderNumber,
          customerName: params.customer.name,
          customerPhone: params.customer.phone,
          customerAddress: params.customer.address,
          notes: params.customer.notes,
          currency: params.currency,
          subtotalAmount: params.subtotalAmount,
          totalAmount: params.totalAmount,
          items: {
            create: params.lines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              sku: l.sku,
              unitPriceAmount: l.unitPriceAmount,
              quantity: l.quantity,
              lineTotalAmount: l.lineTotalAmount,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
    });
  }

  findByIdInTenant(tenantId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, tenantId },
      include: ORDER_INCLUDE,
    });
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });
  }

  /**
   * Cancel an order and return its quantities to stock atomically, appending a
   * `return` movement per line. Idempotency is enforced by the caller (only
   * invoked for a non-cancelled order).
   */
  cancelAndRestock(tenantId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirstOrThrow({
        where: { id: orderId, tenantId },
        include: { items: true },
      });

      for (const line of order.items) {
        const res = await tx.inventoryItem.updateMany({
          where: { tenantId, productId: line.productId },
          data: { quantityOnHand: { increment: line.quantity } },
        });
        if (res.count !== 1) continue; // product/inventory removed — skip ledger

        const item = await tx.inventoryItem.findFirstOrThrow({
          where: { tenantId, productId: line.productId },
          select: { id: true, quantityOnHand: true },
        });
        await tx.stockMovement.create({
          data: {
            tenantId,
            inventoryItemId: item.id,
            type: 'return',
            quantityChange: line.quantity,
            quantityAfter: item.quantityOnHand,
            note: `cancel ${order.orderNumber}`,
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
        include: ORDER_INCLUDE,
      });
    });
  }

  async listAndCount(params: ListOrdersParams) {
    const where: Prisma.OrderWhereInput = {
      tenantId: params.tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { orderNumber: { contains: params.search, mode: 'insensitive' } },
              {
                customerName: { contains: params.search, mode: 'insensitive' },
              },
              {
                customerPhone: { contains: params.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { rows, total };
  }
}
