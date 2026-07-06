import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: jest.Mocked<CategoriesRepository>;
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
    id: 'cat-1',
    name: 'Sandals',
    slug: 'sandals',
    parentId: null,
    position: 0,
    _count: { products: 3 },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoriesRepository,
          useValue: {
            listByTenant: jest.fn(),
            findByIdInTenant: jest.fn(),
            slugTakenUnderParent: jest.fn().mockResolvedValue(false),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
    repo = moduleRef.get(CategoriesRepository);
    audit = moduleRef.get(AuditService);
  });

  describe('list', () => {
    it('maps rows with productCount', async () => {
      repo.listByTenant.mockResolvedValue([row] as any);
      const result = await service.list(tenantId);
      expect(result[0]).toEqual({
        id: 'cat-1',
        name: 'Sandals',
        slug: 'sandals',
        parentId: null,
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
        { name: 'Sandal Pria' } as any,
        actor,
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'sandal-pria', position: 0 }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'category.created' }),
      );
      expect(result.productCount).toBe(3);
    });

    it('validates the parent belongs to the tenant (422)', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.create(
          tenantId,
          { name: 'Child', parentId: 'ghost' } as any,
          actor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a duplicate slug under the same parent (409)', async () => {
      repo.slugTakenUnderParent.mockResolvedValue(true);
      await expect(
        service.create(tenantId, { name: 'Sandals' } as any, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('rejects an empty patch (422)', async () => {
      await expect(
        service.update(tenantId, 'cat-1', {} as any, actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws 404 for a missing category', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.update(tenantId, 'x', { name: 'New' } as any, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects making a category its own parent (422)', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      await expect(
        service.update(tenantId, 'cat-1', { parentId: 'cat-1' } as any, actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('disconnects the parent when parentId is null', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.update.mockResolvedValue(row as any);
      await service.update(tenantId, 'cat-1', { parentId: null } as any, actor);
      expect(repo.update).toHaveBeenCalledWith(
        'cat-1',
        expect.objectContaining({ parent: { disconnect: true } }),
      );
    });

    it('updates name + position and audits', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.update.mockResolvedValue({ ...row, name: 'New', position: 2 } as any);
      const result = await service.update(
        tenantId,
        'cat-1',
        { name: 'New', position: 2 } as any,
        actor,
      );
      expect(result.name).toBe('New');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'category.updated' }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes and audits', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      await service.remove(tenantId, 'cat-1', actor);
      expect(repo.softDelete).toHaveBeenCalledWith(tenantId, 'cat-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'category.deleted' }),
      );
    });

    it('throws 404 for a missing category', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.remove(tenantId, 'x', actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
