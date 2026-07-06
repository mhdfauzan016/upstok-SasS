import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface ReportSummary {
  range: { from: string; to: string };
  currency: string;
  revenue: { total: number; orderCount: number; avgOrderValue: number };
  ordersByStatus: { status: string; count: number; revenue: number }[];
  revenueByMonth: { month: string; orders: number; revenue: number }[];
  topProducts: {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }[];
  inventory: {
    totalOnHand: number;
    stockValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
    productCount: number;
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregated store report for a tenant over an (optional) date range. */
  async getSummary(
    tenantId: string,
    fromInput?: string,
    toInput?: string,
  ): Promise<ReportSummary> {
    const now = new Date();
    // Default window: start of the month 5 months ago → now (6 month span).
    const from = fromInput
      ? new Date(fromInput)
      : new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const to = toInput ? new Date(`${toInput}T23:59:59.999Z`) : now;

    const orderWhere = {
      tenantId,
      createdAt: { gte: from, lte: to },
    };
    // Revenue excludes cancelled orders.
    const paidWhere = { ...orderWhere, status: { not: OrderStatus.cancelled } };

    const [byStatusRaw, paidOrders, itemGroups, invItems, productCount] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ['status'],
          where: orderWhere,
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.findMany({
          where: paidWhere,
          select: { createdAt: true, totalAmount: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId'],
          where: { order: paidWhere },
          _sum: { quantity: true, lineTotalAmount: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        }),
        this.prisma.inventoryItem.findMany({
          where: { tenantId, product: { deletedAt: null } },
          select: {
            quantityOnHand: true,
            lowStockThreshold: true,
            product: { select: { priceAmount: true } },
          },
        }),
        this.prisma.product.count({ where: { tenantId, deletedAt: null } }),
      ]);

    // Revenue totals (non-cancelled).
    const total = paidOrders.reduce((s, o) => s + o.totalAmount, 0);
    const orderCount = paidOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(total / orderCount) : 0;

    const ordersByStatus = byStatusRaw.map((r) => ({
      status: r.status,
      count: r._count._all,
      revenue: r._sum.totalAmount ?? 0,
    }));

    // Monthly buckets across the range.
    const months: { month: string; orders: number; revenue: number }[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      months.push({
        month: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        orders: 0,
        revenue: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const monthIndex = new Map(months.map((m, i) => [m.month, i]));
    for (const o of paidOrders) {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const i = monthIndex.get(key);
      if (i !== undefined) {
        months[i].orders += 1;
        months[i].revenue += o.totalAmount;
      }
    }

    // Top products — resolve names from the current product records.
    const productIds = itemGroups.map((g) => g.productId);
    const productRows = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true },
        })
      : [];
    const productMap = new Map(productRows.map((p) => [p.id, p]));
    const topProducts = itemGroups.map((g) => ({
      productId: g.productId,
      name: productMap.get(g.productId)?.name ?? 'Produk dihapus',
      sku: productMap.get(g.productId)?.sku ?? '—',
      quantity: g._sum.quantity ?? 0,
      revenue: g._sum.lineTotalAmount ?? 0,
    }));

    // Inventory health (current snapshot, not range-bound).
    const inventory = invItems.reduce(
      (acc, i) => {
        acc.totalOnHand += i.quantityOnHand;
        acc.stockValuation += i.quantityOnHand * i.product.priceAmount;
        if (i.quantityOnHand === 0) acc.outOfStockCount += 1;
        else if (i.lowStockThreshold > 0 && i.quantityOnHand <= i.lowStockThreshold)
          acc.lowStockCount += 1;
        return acc;
      },
      {
        totalOnHand: 0,
        stockValuation: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        productCount,
      },
    );

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      currency: 'IDR',
      revenue: { total, orderCount, avgOrderValue },
      ordersByStatus,
      revenueByMonth: months,
      topProducts,
      inventory,
    };
  }
}
