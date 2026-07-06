import { Injectable } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface CreateTenantWithOwnerParams {
  storeName: string;
  slug: string;
  planId: string;
  owner: { name: string; email: string; passwordHash: string };
}

export interface UpdateTenantProfileParams {
  name?: string;
  branding?: Prisma.InputJsonValue;
}

export interface ListTenantsParams {
  status?: TenantStatus;
  search?: string;
  skip: number;
  take: number;
}

/**
 * Data-access layer for the Tenant domain. The only place Prisma is touched
 * for tenants. Provisioning, status changes and cross-tenant listing are
 * platform-scoped operations and run against the base PrismaService directly.
 */
@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySlug(slug: string) {
    return this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  findActivePlanByCode(code: string) {
    return this.prisma.plan.findFirst({
      where: { code, isActive: true },
      select: { id: true },
    });
  }

  findActiveBrandingBySlug(slug: string) {
    return this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      select: { name: true, status: true, branding: true },
    });
  }

  findProfileById(id: string) {
    return this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscription: { include: { plan: true } },
      },
    });
  }

  /**
   * Atomically create the tenant, its founding TENANT_OWNER user and a
   * subscription to the chosen plan, then back-link ownerUserId.
   */
  createWithOwner(params: CreateTenantWithOwnerParams) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: params.slug,
          name: params.storeName,
          status: 'active',
          branding: {},
        },
      });

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: params.owner.name,
          email: params.owner.email,
          passwordHash: params.owner.passwordHash,
          role: 'TENANT_OWNER',
          status: 'active',
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { ownerUserId: owner.id },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: params.planId,
          status: 'trialing',
        },
      });

      return { tenant, owner };
    });
  }

  updateProfile(id: string, data: UpdateTenantProfileParams) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  updateStatus(id: string, status: TenantStatus) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async listAndCount(params: ListTenantsParams) {
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: { subscription: { include: { plan: true } } },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { rows, total };
  }
}
