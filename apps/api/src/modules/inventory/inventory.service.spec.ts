import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: jest.Mocked<InventoryRepository>;
  let audit: jest.Mocked<AuditService>;

  const tenantId = 'tenant-1';
  const productId = 'prod-1';
  const actor: AuthUser = {
    id: 'user-1',
    email: 'staff@store.com',
    name: 'Staff',
    role: 'STAFF',
    scope: 'tenant',
    tenantId,
  };

  const item = {
    id: 'inv-1',
    tenantId,
    productId,
    quantityOnHand: 10,
    reservedQuantity: 2,
    lowStockThreshold: 5,
    updatedAt: new Date('2026-01-02'),
    product: { name: 'Sandal Jepit', sku: 'SKU-1', deletedAt: null },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: {
            findItemByProductId: jest.fn(),
            findItemById: jest.fn(),
            listAndCount: jest.fn(),
            listLowStockIds: jest.fn(),
            updateThreshold: jest.fn(),
            applyMovement: jest.fn(),
            listMovementsAndCount: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(InventoryService);
    repo = moduleRef.get(InventoryRepository);
    audit = moduleRef.get(AuditService);
  });

  describe('list', () => {
    it('maps rows with availability + low-stock flag and pagination', async () => {
      repo.listAndCount.mockResolvedValue({ rows: [item], total: 1 } as any);
      const result = await service.list(tenantId, {
        page: 1,
        limit: 20,
      } as any);
      expect(result.data[0]).toMatchObject({
        productId,
        sku: 'SKU-1',
        quantityOnHand: 10,
        quantityAvailable: 8,
        lowStock: false,
      });
      expect(result.meta.total).toBe(1);
    });

    it('passes lowStockOnly=true when query lowStock is "true"', async () => {
      repo.listAndCount.mockResolvedValue({ rows: [], total: 0 } as any);
      await service.list(tenantId, {
        page: 1,
        limit: 20,
        lowStock: 'true',
      } as any);
      expect(repo.listAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ lowStockOnly: true }),
      );
    });
  });

  describe('getByProductId', () => {
    it('flags low stock when on-hand <= threshold', async () => {
      repo.findItemByProductId.mockResolvedValue({
        ...item,
        quantityOnHand: 5,
      } as any);
      const view = await service.getByProductId(tenantId, productId);
      expect(view.lowStock).toBe(true);
    });

    it('throws 404 when not found', async () => {
      repo.findItemByProductId.mockResolvedValue(null);
      await expect(
        service.getByProductId(tenantId, 'ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('adjust', () => {
    it('applies a positive delta, defaults type to restock, and audits', async () => {
      repo.findItemByProductId.mockResolvedValue(item as any);
      repo.applyMovement.mockResolvedValue({
        ...item,
        quantityOnHand: 15,
      } as any);

      const view = await service.adjust(
        tenantId,
        productId,
        { quantityChange: 5 } as any,
        actor,
      );

      expect(repo.applyMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          inventoryItemId: 'inv-1',
          type: 'restock',
          quantityChange: 5,
          quantityAfter: 15,
          actorId: 'user-1',
        }),
      );
      expect(view.quantityOnHand).toBe(15);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'inventory.adjusted' }),
      );
    });

    it('defaults a negative delta type to adjustment', async () => {
      repo.findItemByProductId.mockResolvedValue(item as any);
      repo.applyMovement.mockResolvedValue({
        ...item,
        quantityOnHand: 7,
      } as any);
      await service.adjust(
        tenantId,
        productId,
        { quantityChange: -3 } as any,
        actor,
      );
      expect(repo.applyMovement).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'adjustment', quantityAfter: 7 }),
      );
    });

    it('honours an explicit type', async () => {
      repo.findItemByProductId.mockResolvedValue(item as any);
      repo.applyMovement.mockResolvedValue(item as any);
      await service.adjust(
        tenantId,
        productId,
        { quantityChange: 2, type: 'return' } as any,
        actor,
      );
      expect(repo.applyMovement).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'return' }),
      );
    });

    it('rejects a zero delta (422)', async () => {
      await expect(
        service.adjust(tenantId, productId, { quantityChange: 0 } as any, actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.applyMovement).not.toHaveBeenCalled();
    });

    it('rejects a delta that drives stock below zero (422)', async () => {
      repo.findItemByProductId.mockResolvedValue(item as any);
      await expect(
        service.adjust(
          tenantId,
          productId,
          { quantityChange: -50 } as any,
          actor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.applyMovement).not.toHaveBeenCalled();
    });

    it('throws 404 for a missing product', async () => {
      repo.findItemByProductId.mockResolvedValue(null);
      await expect(
        service.adjust(tenantId, 'x', { quantityChange: 1 } as any, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('updates the threshold and audits', async () => {
      repo.findItemByProductId.mockResolvedValue(item as any);
      repo.updateThreshold.mockResolvedValue({
        ...item,
        lowStockThreshold: 20,
      } as any);

      const view = await service.updateSettings(
        tenantId,
        productId,
        { lowStockThreshold: 20 } as any,
        actor,
      );

      expect(repo.updateThreshold).toHaveBeenCalledWith('inv-1', 20);
      expect(view.lowStockThreshold).toBe(20);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'inventory.settings_updated' }),
      );
    });

    it('throws 404 for a missing product', async () => {
      repo.findItemByProductId.mockResolvedValue(null);
      await expect(
        service.updateSettings(
          tenantId,
          'x',
          { lowStockThreshold: 1 } as any,
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listMovements', () => {
    it('returns the ledger for the product', async () => {
      repo.findItemByProductId.mockResolvedValue(item as any);
      repo.listMovementsAndCount.mockResolvedValue({
        rows: [
          {
            id: 'mov-1',
            type: 'restock',
            quantityChange: 5,
            quantityAfter: 15,
            note: 'box arrived',
            actorId: 'user-1',
            createdAt: new Date('2026-01-03'),
          },
        ],
        total: 1,
      } as any);

      const result = await service.listMovements(tenantId, productId, 1, 20);
      expect(repo.listMovementsAndCount).toHaveBeenCalledWith(
        tenantId,
        'inv-1',
        0,
        20,
      );
      expect(result.data[0]).toMatchObject({ type: 'restock', quantityAfter: 15 });
      expect(result.meta.total).toBe(1);
    });

    it('throws 404 for a missing product', async () => {
      repo.findItemByProductId.mockResolvedValue(null);
      await expect(
        service.listMovements(tenantId, 'x', 1, 20),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
