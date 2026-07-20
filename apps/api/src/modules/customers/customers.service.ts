import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { CustomersRepository } from './customers.repository';
import { CustomerView } from './entities/customer.entity';
import { CustomerStatusFilter } from './dto/list-customers-query.dto';
import { CustomerStatusUpdate } from './dto/update-customer.dto';

type CustomerRow = NonNullable<
  Awaited<ReturnType<CustomersRepository['findByIdInTenant']>>
>;

@Injectable()
export class CustomersService {
  constructor(
    private readonly repo: CustomersRepository,
    private readonly audit: AuditService,
  ) {}

  /** GET /customers — console list, optional status filter. */
  async list(
    tenantId: string,
    status?: CustomerStatusFilter,
  ): Promise<CustomerView[]> {
    const rows = await this.repo.listByTenant(
      tenantId,
      status as CustomerStatus | undefined,
    );
    return rows.map((r) => this.toView(r));
  }

  /** PATCH /customers/:id — approve (active) or block (disabled). */
  async setStatus(
    tenantId: string,
    id: string,
    status: CustomerStatusUpdate,
    actor: AuthUser,
  ): Promise<CustomerView> {
    const existing = await this.repo.findByIdInTenant(tenantId, id);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'customer not found',
      });
    }

    const updated = await this.repo.updateStatus(
      id,
      status as CustomerStatus,
    );

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action:
        status === CustomerStatusUpdate.ACTIVE
          ? 'customer.approved'
          : 'customer.disabled',
      targetType: 'customer',
      targetId: id,
    });

    return this.toView(updated);
  }

  private toView(row: CustomerRow): CustomerView {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      createdAt: row.createdAt,
    };
  }
}
