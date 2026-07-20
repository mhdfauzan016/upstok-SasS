import { Injectable } from '@nestjs/common';
import { CustomerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

const CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
} satisfies Prisma.CustomerSelect;

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByTenant(tenantId: string, status?: CustomerStatus) {
    return this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, ...(status ? { status } : {}) },
      orderBy: [{ createdAt: 'desc' }],
      select: CUSTOMER_SELECT,
    });
  }

  findByIdInTenant(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: CUSTOMER_SELECT,
    });
  }

  /**
   * Update status. When disabling, bump tokenVersion to revoke active
   * sessions immediately (the access-token check compares tokenVersion).
   */
  updateStatus(id: string, status: CustomerStatus) {
    return this.prisma.customer.update({
      where: { id },
      data: {
        status,
        ...(status === 'disabled'
          ? { tokenVersion: { increment: 1 } }
          : {}),
      },
      select: CUSTOMER_SELECT,
    });
  }
}
