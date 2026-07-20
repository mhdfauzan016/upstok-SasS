import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';
import { CustomerStatusUpdate } from './dto/update-customer.dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: jest.Mocked<CustomersRepository>;
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
    id: 'cust-1',
    name: 'Toko Jaya',
    email: 'jaya@store.com',
    phone: '0812',
    status: 'pending',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: CustomersRepository,
          useValue: {
            listByTenant: jest.fn(),
            findByIdInTenant: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(CustomersService);
    repo = moduleRef.get(CustomersRepository);
    audit = moduleRef.get(AuditService);
  });

  describe('list', () => {
    it('maps rows to views', async () => {
      repo.listByTenant.mockResolvedValue([row] as any);
      const result = await service.list(tenantId);
      expect(result[0]).toEqual({
        id: 'cust-1',
        name: 'Toko Jaya',
        email: 'jaya@store.com',
        phone: '0812',
        status: 'pending',
        createdAt: row.createdAt,
      });
    });
  });

  describe('setStatus', () => {
    it('approves a pending customer and audits', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.updateStatus.mockResolvedValue({ ...row, status: 'active' } as any);

      const result = await service.setStatus(
        tenantId,
        'cust-1',
        CustomerStatusUpdate.ACTIVE,
        actor,
      );

      expect(repo.updateStatus).toHaveBeenCalledWith('cust-1', 'active');
      expect(result.status).toBe('active');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.approved' }),
      );
    });

    it('audits a disable as customer.disabled', async () => {
      repo.findByIdInTenant.mockResolvedValue(row as any);
      repo.updateStatus.mockResolvedValue({ ...row, status: 'disabled' } as any);

      await service.setStatus(
        tenantId,
        'cust-1',
        CustomerStatusUpdate.DISABLED,
        actor,
      );

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.disabled' }),
      );
    });

    it('throws 404 for a missing customer', async () => {
      repo.findByIdInTenant.mockResolvedValue(null);
      await expect(
        service.setStatus(tenantId, 'x', CustomerStatusUpdate.ACTIVE, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });
  });
});
