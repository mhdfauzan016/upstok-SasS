import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: jest.Mocked<OrdersRepository>;
  let audit: jest.Mocked<AuditService>;

  const tenantId = 'tenant-1';
  const actor: AuthUser = {
    id: 'user-1',
    email: 'staff@store.com',
    name: 'Staff',
    role: 'TENANT_ADMIN',
    scope: 'tenant',
    tenantId,
  };

  const product = {
    id: 'prod-1',
    name: 'Sandal Jepit',
    sku: 'SKU-1',
    priceAmount: 25000,
    currency: 'IDR',
  };

  const orderRow = {
    id: 'order-1',
    orderNumber: 'ORD-20260629-123456',
    status: 'pending',
    customerName: 'Toko Jaya',
    customerPhone: '0812',
    customerAddress: 'Jl. Contoh',
    notes: null,
    currency: 'IDR',
    subtotalAmount: 50000,
    totalAmount: 50000,
    createdAt: new Date('2026-06-29'),
    items: [
      {
        productId: 'prod-1',
        productName: 'Sandal Jepit',
        sku: 'SKU-1',
        unitPriceAmount: 25000,
        quantity: 2,
        lineTotalAmount: 50000,
      },
    ],
    _count: { items: 1 },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: {
            findActiveProducts: jest.fn(),
            getOrderLimit: jest.fn().mockResolvedValue(null),
            countSince: jest.fn(),
            createWithStockDecrement: jest.fn(),
            findByIdInTenant: jest.fn(),
            updateStatus: jest.fn(),
            cancelAndRestock: jest.fn(),
            listAndCount: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
    repo = moduleRef.get(OrdersRepository);
    audit = moduleRef.get(AuditService);
  });

  const createDto = (quantity = 2) => ({
    customer: { name: 'Toko Jaya', phone: '0812', address: 'Jl. Contoh' },
    items: [{ productId: 'prod-1', quantity }],
  });

  describe('create', () => {
    it('recomputes totals from DB prices (ignores any client price) and audits', async () => {
      repo.findActiveProducts.mockResolvedValue([product] as any);
      repo.createWithStockDecrement.mockResolvedValue(orderRow as any);

      const result = await service.create(tenantId, createDto() as any);

      expect(repo.createWithStockDecrement).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          currency: 'IDR',
          subtotalAmount: 50000,
          totalAmount: 50000,
          lines: [
            expect.objectContaining({
              productId: 'prod-1',
              unitPriceAmount: 25000,
              quantity: 2,
              lineTotalAmount: 50000,
            }),
          ],
        }),
      );
      expect(result.total).toEqual({ amount: 50000, currency: 'IDR' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'order.created' }),
      );
    });

    it('collapses duplicate productIds into a summed quantity', async () => {
      repo.findActiveProducts.mockResolvedValue([product] as any);
      repo.createWithStockDecrement.mockResolvedValue(orderRow as any);

      await service.create(tenantId, {
        customer: createDto().customer,
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-1', quantity: 3 },
        ],
      } as any);

      expect(repo.createWithStockDecrement).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [expect.objectContaining({ quantity: 5 })],
        }),
      );
    });

    it('rejects an unavailable/foreign product (422)', async () => {
      repo.findActiveProducts.mockResolvedValue([]); // none found
      await expect(
        service.create(tenantId, createDto() as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.createWithStockDecrement).not.toHaveBeenCalled();
    });

    it('propagates the oversell conflict from the repository (409)', async () => {
      repo.findActiveProducts.mockResolvedValue([product] as any);
      repo.createWithStockDecrement.mockRejectedValue(
        new ConflictException({ code: 'INSUFFICIENT_STOCK', message: 'x' }),
      );
      await expect(
        service.create(tenantId, createDto() as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('enforces the monthly order plan limit (403)', async () => {
      repo.findActiveProducts.mockResolvedValue([product] as any);
      repo.getOrderLimit.mockResolvedValue(100);
      repo.countSince.mockResolvedValue(100);
      await expect(
        service.create(tenantId, createDto() as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.createWithStockDecrement).not.toHaveBeenCalled();
    });

    it('allows creation below the order limit', async () => {
      repo.findActiveProducts.mockResolvedValue([product] as any);
      repo.getOrderLimit.mockResolvedValue(100);
      repo.countSince.mockResolvedValue(99);
      repo.createWithStockDecrement.mockResolvedValue(orderRow as any);
      await expect(
        service.create(tenantId, createDto() as any),
      ).resolves.toBeDefined();
    });
  });

  describe('list', () => {
    it('maps rows with item count + pagination', async () => {
      repo.listAndCount.mockResolvedValue({ rows: [orderRow], total: 1 } as any);
      const result = await service.list(tenantId, { page: 1, limit: 20 } as any);
      expect(result.data[0]).toMatchObject({
        orderNumber: 'ORD-20260629-123456',
        itemCount: 1,
        total: { amount: 50000, currency: 'IDR' },
      });
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('returns detail with line items', async () => {
      repo.findByIdInTenant.mockResolvedValue(orderRow as any);
      const detail = await service.getById(tenantId, 'order-1');
      expect(detail.items).toHaveLength(1);
      expect(detail.items[0]).toMatchObject({ sku: 'SKU-1', quantity: 2 });
    });

    it('throws 404 when not found', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.getById(tenantId, 'ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('advances a normal status without restocking', async () => {
      repo.findByIdInTenant.mockResolvedValue(orderRow as any);
      repo.updateStatus.mockResolvedValue({
        ...orderRow,
        status: 'shipped',
      } as any);

      const result = await service.updateStatus(
        tenantId,
        'order-1',
        { status: 'shipped' } as any,
        actor,
      );

      expect(repo.updateStatus).toHaveBeenCalledWith('order-1', 'shipped');
      expect(repo.cancelAndRestock).not.toHaveBeenCalled();
      expect(result.status).toBe('shipped');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'order.status_changed' }),
      );
    });

    it('restocks when cancelling a non-cancelled order', async () => {
      repo.findByIdInTenant.mockResolvedValue(orderRow as any);
      repo.cancelAndRestock.mockResolvedValue({
        ...orderRow,
        status: 'cancelled',
      } as any);

      await service.updateStatus(
        tenantId,
        'order-1',
        { status: 'cancelled' } as any,
        actor,
      );

      expect(repo.cancelAndRestock).toHaveBeenCalledWith(tenantId, 'order-1');
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects reactivating a cancelled order (422)', async () => {
      repo.findByIdInTenant.mockResolvedValue({
        ...orderRow,
        status: 'cancelled',
      } as any);
      await expect(
        service.updateStatus(
          tenantId,
          'order-1',
          { status: 'shipped' } as any,
          actor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws 404 for a missing order', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.updateStatus(
          tenantId,
          'x',
          { status: 'shipped' } as any,
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
