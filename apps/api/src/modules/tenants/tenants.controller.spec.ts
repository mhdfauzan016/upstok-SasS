import { Test } from '@nestjs/testing';
import type { AuthUser, TenantContext } from '../../common/decorators';
import {
  PlatformTenantsController,
  TenantsController,
} from './tenants.controller';
import { TenantStatusAction } from './dto/update-tenant-status.dto';
import { TenantsService } from './tenants.service';

describe('Tenant controllers', () => {
  let controller: TenantsController;
  let platform: PlatformTenantsController;
  let service: jest.Mocked<TenantsService>;

  const tenant: TenantContext = {
    tenantId: 'tenant-1',
    tenantSlug: 'acme',
    status: 'active',
  };
  const actor: AuthUser = {
    id: 'user-1',
    email: 'owner@store.com',
    name: 'Owner',
    role: 'TENANT_OWNER',
    scope: 'tenant',
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantsController, PlatformTenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: {
            create: jest.fn(),
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            getPublicBranding: jest.fn(),
            list: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(TenantsController);
    platform = moduleRef.get(PlatformTenantsController);
    service = moduleRef.get(TenantsService);
  });

  it('delegates signup to the service', async () => {
    const dto = {
      storeName: 'Acme',
      slug: 'acme',
      planCode: 'growth',
      owner: { name: 'O', email: 'o@x.com', password: 'sup3rsecret' },
    };
    await controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('reads the profile using the resolved tenant id', async () => {
    await controller.getProfile(tenant);
    expect(service.getProfile).toHaveBeenCalledWith('tenant-1');
  });

  it('passes tenant id, slug and actor when updating the profile', async () => {
    const dto = { name: 'New' };
    await controller.updateProfile(tenant, actor, dto as any);
    expect(service.updateProfile).toHaveBeenCalledWith(
      'tenant-1',
      'acme',
      dto,
      actor,
    );
  });

  it('serves public branding by slug', async () => {
    await controller.getBranding(tenant);
    expect(service.getPublicBranding).toHaveBeenCalledWith('acme');
  });

  it('lists tenants (platform)', async () => {
    const query = { page: 1, limit: 20 };
    await platform.list(query as any);
    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('updates tenant status (platform)', async () => {
    const dto = { status: TenantStatusAction.SUSPENDED, reason: 'fraud' };
    await platform.updateStatus('tenant-1', actor, dto);
    expect(service.updateStatus).toHaveBeenCalledWith('tenant-1', dto, actor);
  });
});
