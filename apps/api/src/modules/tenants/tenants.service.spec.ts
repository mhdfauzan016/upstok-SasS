import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuditService } from '../../shared/audit/audit.service';
import { TenantCacheService } from '../../shared/cache/tenant-cache.service';
import type { AuthUser } from '../../common/decorators';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantStatusAction } from './dto/update-tenant-status.dto';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';

// argon2 is a native module whose exports are non-configurable, so it cannot be
// spied on with jest.spyOn — mock the module instead.
jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn().mockResolvedValue('hashed'),
}));

describe('TenantsService', () => {
  let service: TenantsService;
  let repo: jest.Mocked<TenantsRepository>;
  let audit: jest.Mocked<AuditService>;
  let cache: jest.Mocked<TenantCacheService>;

  const actor: AuthUser = {
    id: 'user-1',
    email: 'owner@store.com',
    name: 'Owner',
    role: 'TENANT_OWNER',
    scope: 'tenant',
    tenantId: 'tenant-1',
  };

  const baseProfile = {
    id: 'tenant-1',
    slug: 'acme',
    name: 'Acme',
    status: 'active',
    branding: { primaryColor: '#111111' },
    subscription: {
      status: 'active',
      plan: { code: 'growth', name: 'Growth' },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: TenantsRepository,
          useValue: {
            findBySlug: jest.fn(),
            findActivePlanByCode: jest.fn(),
            createWithOwner: jest.fn(),
            findProfileById: jest.fn(),
            findActiveBrandingBySlug: jest.fn(),
            updateProfile: jest.fn(),
            updateStatus: jest.fn(),
            listAndCount: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
        {
          provide: TenantCacheService,
          useValue: { invalidate: jest.fn(), get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(TenantsService);
    repo = moduleRef.get(TenantsRepository);
    audit = moduleRef.get(AuditService);
    cache = moduleRef.get(TenantCacheService);
  });

  const validSignup = (): CreateTenantDto => ({
    storeName: 'Acme Store',
    slug: 'acme',
    planCode: 'growth',
    owner: { name: 'Owner', email: 'Owner@Store.com', password: 'sup3rsecret' },
  });

  describe('create', () => {
    it('provisions a tenant with hashed owner password and records audit', async () => {
      repo.findBySlug.mockResolvedValue(null);
      repo.findActivePlanByCode.mockResolvedValue({ id: 'plan-1' } as any);
      const hashMock = argon2.hash as jest.Mock;
      repo.createWithOwner.mockResolvedValue({
        tenant: { id: 'tenant-1', slug: 'acme', name: 'Acme Store', status: 'active' },
        owner: { id: 'user-1', email: 'owner@store.com' },
      } as any);

      const result = await service.create(validSignup());

      expect(hashMock).toHaveBeenCalledWith('sup3rsecret', expect.any(Object));
      // owner email normalized to lowercase before persistence
      expect(repo.createWithOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'acme',
          planId: 'plan-1',
          owner: expect.objectContaining({ email: 'owner@store.com' }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.created' }),
      );
      expect(result.tenant.slug).toBe('acme');
      expect(result.owner.email).toBe('owner@store.com');
    });

    it('rejects a reserved slug with 422', async () => {
      await expect(
        service.create({ ...validSignup(), slug: 'admin' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.createWithOwner).not.toHaveBeenCalled();
    });

    it('rejects a malformed slug with 422', async () => {
      await expect(
        service.create({ ...validSignup(), slug: '-bad-' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a taken slug with 409', async () => {
      repo.findBySlug.mockResolvedValue({ id: 'other' } as any);
      await expect(service.create(validSignup())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects an unknown/inactive plan with 422', async () => {
      repo.findBySlug.mockResolvedValue(null);
      repo.findActivePlanByCode.mockResolvedValue(null);
      await expect(service.create(validSignup())).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  describe('getProfile', () => {
    it('maps the tenant profile including plan + subscription', async () => {
      repo.findProfileById.mockResolvedValue(baseProfile as any);
      const profile = await service.getProfile('tenant-1');
      expect(profile.plan).toEqual({ code: 'growth', name: 'Growth' });
      expect(profile.subscriptionStatus).toBe('active');
      expect(profile.branding.primaryColor).toBe('#111111');
    });

    it('throws 404 when tenant is missing', async () => {
      repo.findProfileById.mockResolvedValue(null);
      await expect(service.getProfile('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('merges branding, invalidates cache and audits', async () => {
      repo.findProfileById.mockResolvedValue(baseProfile as any);
      repo.updateProfile.mockResolvedValue({} as any);
      // getProfile re-fetch after update
      repo.findProfileById.mockResolvedValueOnce(baseProfile as any);
      repo.findProfileById.mockResolvedValueOnce(baseProfile as any);

      await service.updateProfile(
        'tenant-1',
        'acme',
        { branding: { logoUrl: 'https://cdn/x.png' } },
        actor,
      );

      expect(repo.updateProfile).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          branding: expect.objectContaining({
            primaryColor: '#111111',
            logoUrl: 'https://cdn/x.png',
          }),
        }),
      );
      expect(cache.invalidate).toHaveBeenCalledWith('acme');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.updated' }),
      );
    });

    it('rejects an empty patch with 422', async () => {
      await expect(
        service.updateProfile('tenant-1', 'acme', {}, actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws 404 when tenant is missing', async () => {
      repo.findProfileById.mockResolvedValue(null);
      await expect(
        service.updateProfile('x', 'acme', { name: 'New' }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getPublicBranding', () => {
    it('returns branding for an active tenant', async () => {
      repo.findActiveBrandingBySlug.mockResolvedValue({
        name: 'Acme',
        status: 'active',
        branding: { logoUrl: 'https://cdn/x.png', primaryColor: '#111' },
      } as any);
      const branding = await service.getPublicBranding('acme');
      expect(branding).toEqual({
        name: 'Acme',
        logoUrl: 'https://cdn/x.png',
        primaryColor: '#111',
        theme: null,
        description: null,
        address: null,
        phone: null,
        email: null,
      });
    });

    it('throws TENANT_SUSPENDED (403) for a suspended tenant', async () => {
      repo.findActiveBrandingBySlug.mockResolvedValue({
        name: 'Acme',
        status: 'suspended',
        branding: {},
      } as any);
      await expect(service.getPublicBranding('acme')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws 404 for an unknown tenant', async () => {
      repo.findActiveBrandingBySlug.mockResolvedValue(null);
      await expect(service.getPublicBranding('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('returns paginated tenant rows with plan names', async () => {
      repo.listAndCount.mockResolvedValue({
        rows: [baseProfile],
        total: 1,
      } as any);
      const result = await service.list({ page: 2, limit: 10 } as any);
      expect(repo.listAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.data[0].plan).toBe('Growth');
      expect(result.meta).toEqual({ page: 2, limit: 10, total: 1 });
    });
  });

  describe('updateStatus', () => {
    it('changes status, invalidates cache and audits the transition', async () => {
      repo.findProfileById.mockResolvedValue(baseProfile as any);
      repo.updateStatus.mockResolvedValue({
        id: 'tenant-1',
        status: 'suspended',
      } as any);

      const result = await service.updateStatus(
        'tenant-1',
        { status: TenantStatusAction.SUSPENDED, reason: 'fraud' },
        { ...actor, scope: 'platform' },
      );

      expect(repo.updateStatus).toHaveBeenCalledWith('tenant-1', 'suspended');
      expect(cache.invalidate).toHaveBeenCalledWith('acme');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tenant.status_changed',
          metadata: expect.objectContaining({ from: 'active', to: 'suspended' }),
        }),
      );
      expect(result.status).toBe('suspended');
    });

    it('is idempotent when status is unchanged (no write, no audit)', async () => {
      repo.findProfileById.mockResolvedValue(baseProfile as any);
      const result = await service.updateStatus(
        'tenant-1',
        { status: TenantStatusAction.ACTIVE },
        { ...actor, scope: 'platform' },
      );
      expect(repo.updateStatus).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
      expect(result.status).toBe('active');
    });

    it('throws 404 for a missing tenant', async () => {
      repo.findProfileById.mockResolvedValue(null);
      await expect(
        service.updateStatus(
          'x',
          { status: TenantStatusAction.SUSPENDED },
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
