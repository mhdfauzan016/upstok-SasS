import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { BrandsRepository } from './brands.repository';
import { BrandsService } from './brands.service';

describe('BrandsService', () => {
  let service: BrandsService;
  let repo: jest.Mocked<BrandsRepository>;
  let audit: jest.Mocked<AuditService>;

  const tenantId = 'tenant-1';
  const actor: AuthUser = {
    id: 'user-1',
    email: 'owner@store.com',
    name: 'Owner',
    role: 'TENANT_OWNER',
    scope: 'tenant',
    tenantId,
  };

  const row = {
    id: 'brand-1',
    name: 'Nike',
    slug: 'nike',
    position: 0,
    _count: { products: 3 },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: BrandsRepository,
          useValue: {
            listByTenant: jest.fn(),
            findByIdInTenant: jest.fn(),
            slugTaken: jest.fn().mockResolvedValue(false),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(BrandsService);
    repo = moduleRef.get(BrandsRepository);
    audit = moduleRef.get(AuditService);
  });

  describe('list', () => {
    it('maps rows with productCount', async () => {
      repo.listByTenant.mockResolvedValue([row] as any);
      const result = await service.list(tenantId);
      expect(result[0]).toEqual({
        id: 'brand-1',
        name: 'Nike',
        slug: 'nike',
        position: 0,
        productCount: 3,
      });
    });
  });

  describe('create', () => {
    it('auto-slugifies the name and audits', async () => {
      repo.create.mockResolvedValue(row as any);
      const result = await service.create(
        tenantId,
        { name: 'New Balance' } as any,
        actor,
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'new-balance', position: 0 }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'brand.created' }),
      );
      expect(result.productCount).toBe(3);
    });

    it('rejects a duplicate slug (409)', async () => {
      repo.slugTaken.mockResolvedValue(true);
      await expect(
        service.create(tenantId, { name: 'Nike' } as any, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('rejects an empty patch (422)', async () => {
      await expect(
        service.update(tenantId, 'brand-1', {} as any, actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws 404 for a missing brand', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.update(tenantId, 'x', { name: 'New' } as any, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates name + position and audits', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.update.mockResolvedValue({ ...row, name: 'New', position: 2 } as any);
      const result = await service.update(
        tenantId,
        'brand-1',
        { name: 'New', position: 2 } as any,
        actor,
      );
      expect(result.name).toBe('New');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'brand.updated' }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes and audits', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      await service.remove(tenantId, 'brand-1', actor);
      expect(repo.softDelete).toHaveBeenCalledWith(tenantId, 'brand-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'brand.deleted' }),
      );
    });

    it('throws 404 for a missing brand', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.remove(tenantId, 'x', actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
