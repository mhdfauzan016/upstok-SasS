import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: jest.Mocked<ProductsRepository>;
  let audit: jest.Mocked<AuditService>;

  const tenantId = 'tenant-1';
  const actor: AuthUser = {
    id: 'user-1',
    email: 'staff@store.com',
    name: 'Staff',
    role: 'STAFF',
    scope: 'tenant',
    tenantId,
  };

  const row = {
    id: 'prod-1',
    name: 'Sandal Jepit',
    slug: 'sandal-jepit',
    sku: 'SKU-1',
    description: 'comfy',
    priceAmount: 25000,
    currency: 'IDR',
    images: ['https://cdn/x.png'],
    status: 'active',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Sandals' },
    inventory: { quantityOnHand: 5 },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: {
            countByTenant: jest.fn(),
            getProductLimit: jest.fn(),
            findCategoryInTenant: jest.fn(),
            skuExists: jest.fn().mockResolvedValue(false),
            slugExists: jest.fn().mockResolvedValue(false),
            create: jest.fn(),
            findByIdInTenant: jest.fn(),
            findPublicBySlug: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            listPublicAndCount: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
    repo = moduleRef.get(ProductsRepository);
    audit = moduleRef.get(AuditService);
  });

  const createDto = () => ({
    name: 'Sandal Jepit',
    sku: 'SKU-1',
    price: { amount: 25000, currency: 'idr' },
  });

  describe('listPublic', () => {
    it('maps active rows with availability + pagination', async () => {
      repo.listPublicAndCount.mockResolvedValue({ rows: [row], total: 1 } as any);
      const result = await service.listPublic(tenantId, {
        page: 1,
        limit: 20,
      } as any);
      expect(result.data[0]).toMatchObject({
        slug: 'sandal-jepit',
        available: true,
        price: { amount: 25000, currency: 'IDR' },
      });
      expect(result.data[0].sku).toBe('SKU-1');
      expect(result.data[0].stock).toBe(5);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getPublicBySlug', () => {
    it('returns detail with category + quantity', async () => {
      repo.findPublicBySlug.mockResolvedValue(row as any);
      const detail = await service.getPublicBySlug(tenantId, 'sandal-jepit');
      expect(detail.category).toEqual({ id: 'cat-1', name: 'Sandals' });
      expect(detail.quantityAvailable).toBe(5);
    });

    it('throws 404 when not found', async () => {
      repo.findPublicBySlug.mockResolvedValue(null);
      await expect(
        service.getPublicBySlug(tenantId, 'ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('auto-slugifies the name, normalizes currency and audits', async () => {
      repo.getProductLimit.mockResolvedValue(null);
      repo.create.mockResolvedValue(row as any);

      const result = await service.create(tenantId, createDto() as any, actor);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'sandal-jepit',
          currency: 'IDR',
          status: 'draft',
          images: [],
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.created' }),
      );
      expect(result.sku).toBe('SKU-1');
    });

    it('enforces the plan product limit (403)', async () => {
      repo.getProductLimit.mockResolvedValue(10);
      repo.countByTenant.mockResolvedValue(10);
      await expect(
        service.create(tenantId, createDto() as any, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('allows creation below the plan limit', async () => {
      repo.getProductLimit.mockResolvedValue(10);
      repo.countByTenant.mockResolvedValue(9);
      repo.create.mockResolvedValue(row as any);
      await expect(
        service.create(tenantId, createDto() as any, actor),
      ).resolves.toBeDefined();
    });

    it('rejects a category from another tenant (422)', async () => {
      repo.getProductLimit.mockResolvedValue(null);
      repo.findCategoryInTenant.mockResolvedValue(null);
      await expect(
        service.create(
          tenantId,
          { ...createDto(), categoryId: 'other-cat' } as any,
          actor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a duplicate slug (409)', async () => {
      repo.getProductLimit.mockResolvedValue(null);
      repo.slugExists.mockResolvedValue(true);
      await expect(
        service.create(tenantId, createDto() as any, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a duplicate sku (409)', async () => {
      repo.getProductLimit.mockResolvedValue(null);
      repo.skuExists.mockResolvedValue(true);
      await expect(
        service.create(tenantId, createDto() as any, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('maps price/category changes and audits', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.update.mockResolvedValue({ ...row, name: 'New' } as any);

      const result = await service.update(
        tenantId,
        'prod-1',
        { name: 'New', price: { amount: 30000, currency: 'idr' } } as any,
        actor,
      );

      expect(repo.update).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({
          name: 'New',
          priceAmount: 30000,
          currency: 'IDR',
        }),
      );
      expect(result.name).toBe('New');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.updated' }),
      );
    });

    it('disconnects the category when categoryId is null', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.update.mockResolvedValue(row as any);
      await service.update(
        tenantId,
        'prod-1',
        { categoryId: null } as any,
        actor,
      );
      expect(repo.update).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({ category: { disconnect: true } }),
      );
    });

    it('rejects an empty patch (422)', async () => {
      await expect(
        service.update(tenantId, 'prod-1', {} as any, actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws 404 for a missing/cross-tenant product', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.update(tenantId, 'x', { name: 'New' } as any, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a duplicate sku on update (409)', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.skuExists.mockResolvedValue(true);
      await expect(
        service.update(tenantId, 'prod-1', { sku: 'DUP' } as any, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-deletes and audits', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      await service.remove(tenantId, 'prod-1', actor);
      expect(repo.softDelete).toHaveBeenCalledWith('prod-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.deleted' }),
      );
    });

    it('throws 404 for a missing product', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.remove(tenantId, 'x', actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
