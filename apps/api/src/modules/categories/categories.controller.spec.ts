import { Test } from '@nestjs/testing';
import type { AuthUser, TenantContext } from '../../common/decorators';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

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
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            list: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(CategoriesController);
    service = moduleRef.get(CategoriesService);
  });

  it('lists categories scoped to the tenant', async () => {
    await controller.list(tenant);
    expect(service.list).toHaveBeenCalledWith('tenant-1');
  });

  it('creates a category with tenant + actor', async () => {
    const dto = { name: 'Sandals' };
    await controller.create(tenant, actor, dto as any);
    expect(service.create).toHaveBeenCalledWith('tenant-1', dto, actor);
  });

  it('updates a category', async () => {
    const dto = { name: 'New' };
    await controller.update(tenant, actor, 'cat-1', dto as any);
    expect(service.update).toHaveBeenCalledWith('tenant-1', 'cat-1', dto, actor);
  });

  it('removes a category', async () => {
    await controller.remove(tenant, actor, 'cat-1');
    expect(service.remove).toHaveBeenCalledWith('tenant-1', 'cat-1', actor);
  });
});
