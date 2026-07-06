import { Test } from '@nestjs/testing';
import type { AuthUser, TenantContext } from '../../common/decorators';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  const tenant: TenantContext = {
    tenantId: 'tenant-1',
    tenantSlug: 'acme',
    status: 'active',
  };
  const actor: AuthUser = {
    id: 'user-1',
    email: 'staff@store.com',
    name: 'Staff',
    role: 'STAFF',
    scope: 'tenant',
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            listPublic: jest.fn(),
            getPublicBySlug: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(ProductsController);
    service = moduleRef.get(ProductsService);
  });

  it('lists the public catalog scoped to the tenant', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(tenant, query as any);
    expect(service.listPublic).toHaveBeenCalledWith('tenant-1', query);
  });

  it('serves public detail by slug', async () => {
    await controller.detail(tenant, 'sandal-jepit');
    expect(service.getPublicBySlug).toHaveBeenCalledWith(
      'tenant-1',
      'sandal-jepit',
    );
  });

  it('creates a product with tenant + actor', async () => {
    const dto = { name: 'X', sku: 'S', price: { amount: 1, currency: 'idr' } };
    await controller.create(tenant, actor, dto as any);
    expect(service.create).toHaveBeenCalledWith('tenant-1', dto, actor);
  });

  it('updates a product', async () => {
    const dto = { name: 'Y' };
    await controller.update(tenant, actor, 'prod-1', dto as any);
    expect(service.update).toHaveBeenCalledWith(
      'tenant-1',
      'prod-1',
      dto,
      actor,
    );
  });

  it('removes a product', async () => {
    await controller.remove(tenant, actor, 'prod-1');
    expect(service.remove).toHaveBeenCalledWith('tenant-1', 'prod-1', actor);
  });
});
