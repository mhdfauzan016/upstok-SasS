import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma, TenantStatus } from '@prisma/client';
import {
  RESERVED_SLUGS,
  SLUG_PATTERN,
} from '../../common/constants/reserved-slugs';
import { AuditService } from '../../shared/audit/audit.service';
import { TenantCacheService } from '../../shared/cache/tenant-cache.service';
import type { AuthUser } from '../../common/decorators';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import {
  PaginatedResult,
  PublicBranding,
  TenantCreated,
  TenantListItem,
  TenantProfile,
} from './entities/tenant.entity';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(
    private readonly repo: TenantsRepository,
    private readonly audit: AuditService,
    private readonly cache: TenantCacheService,
  ) {}

  /** POST /tenants — public self-signup. */
  async create(dto: CreateTenantDto): Promise<TenantCreated> {
    const slug = dto.slug.toLowerCase();

    if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'slug is reserved or has an invalid format',
        details: { slug },
      });
    }

    const existing = await this.repo.findBySlug(slug);
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'slug is already taken',
        details: { slug },
      });
    }

    const plan = await this.repo.findActivePlanByCode(dto.planCode);
    if (!plan) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'planCode does not reference an active plan',
        details: { planCode: dto.planCode },
      });
    }

    const passwordHash = await argon2.hash(dto.owner.password, {
      type: argon2.argon2id,
    });

    let created: Awaited<ReturnType<TenantsRepository['createWithOwner']>>;
    try {
      created = await this.repo.createWithOwner({
        storeName: dto.storeName,
        slug,
        planId: plan.id,
        owner: {
          name: dto.owner.name,
          email: dto.owner.email.toLowerCase(),
          passwordHash,
        },
      });
    } catch (err) {
      // Unique violation (slug claimed between check and insert).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'slug is already taken',
          details: { slug },
        });
      }
      throw err;
    }

    await this.audit.record({
      tenantId: created.tenant.id,
      actorId: created.owner.id,
      actorScope: 'tenant',
      action: 'tenant.created',
      targetType: 'tenant',
      targetId: created.tenant.id,
      metadata: { slug, planCode: dto.planCode },
    });

    return {
      tenant: {
        id: created.tenant.id,
        slug: created.tenant.slug,
        name: created.tenant.name,
        status: created.tenant.status,
      },
      owner: { id: created.owner.id, email: created.owner.email },
    };
  }

  /** GET /tenant — current tenant profile (tenant console). */
  async getProfile(tenantId: string): Promise<TenantProfile> {
    const tenant = await this.repo.findProfileById(tenantId);
    if (!tenant) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'tenant not found',
      });
    }
    return this.toProfile(tenant);
  }

  /** PATCH /tenant — update the current tenant's profile/branding. */
  async updateProfile(
    tenantId: string,
    tenantSlug: string,
    dto: UpdateTenantDto,
    actor: AuthUser,
  ): Promise<TenantProfile> {
    if (dto.name === undefined && dto.branding === undefined) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'at least one field (name or branding) must be provided',
      });
    }

    const existing = await this.repo.findProfileById(tenantId);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'tenant not found',
      });
    }

    const data: { name?: string; branding?: Prisma.InputJsonValue } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.branding !== undefined) {
      const current = (existing.branding ?? {}) as Record<string, unknown>;
      data.branding = { ...current, ...dto.branding };
    }

    await this.repo.updateProfile(tenantId, data);
    await this.cache.invalidate(tenantSlug);

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'tenant.updated',
      targetType: 'tenant',
      targetId: tenantId,
      metadata: { fields: Object.keys(data) },
    });

    return this.getProfile(tenantId);
  }

  /** GET /tenant/branding — public storefront theming. */
  async getPublicBranding(slug: string): Promise<PublicBranding> {
    const tenant = await this.repo.findActiveBrandingBySlug(slug);
    if (!tenant) {
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: 'tenant not found',
      });
    }
    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      throw new ForbiddenException({
        code: 'TENANT_SUSPENDED',
        message: 'this store is currently unavailable',
      });
    }
    const branding = (tenant.branding ?? {}) as Record<string, string>;
    return {
      name: tenant.name,
      logoUrl: branding.logoUrl ?? null,
      primaryColor: branding.primaryColor ?? null,
      theme: branding.theme ?? null,
      description: branding.description ?? null,
      address: branding.address ?? null,
      phone: branding.phone ?? null,
      email: branding.email ?? null,
    };
  }

  /** GET /platform/tenants — platform admin list. */
  async list(
    query: ListTenantsQueryDto,
  ): Promise<PaginatedResult<TenantListItem>> {
    const { rows, total } = await this.repo.listAndCount({
      status: query.status as TenantStatus | undefined,
      search: query.search,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: rows.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        status: t.status,
        plan: t.subscription?.plan?.name ?? null,
        createdAt: t.createdAt,
      })),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  /** PATCH /platform/tenants/:tenantId/status — platform admin. */
  async updateStatus(
    tenantId: string,
    dto: UpdateTenantStatusDto,
    actor: AuthUser,
  ): Promise<{ id: string; status: string }> {
    const tenant = await this.repo.findProfileById(tenantId);
    if (!tenant) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'tenant not found',
      });
    }

    if (tenant.status === dto.status) {
      // Idempotent no-op; still refresh cache to be safe.
      await this.cache.invalidate(tenant.slug);
      return { id: tenant.id, status: tenant.status };
    }

    const updated = await this.repo.updateStatus(
      tenantId,
      dto.status as unknown as TenantStatus,
    );
    await this.cache.invalidate(tenant.slug);

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'platform',
      action: 'tenant.status_changed',
      targetType: 'tenant',
      targetId: tenantId,
      metadata: {
        from: tenant.status,
        to: dto.status,
        reason: dto.reason ?? null,
      },
    });

    return updated;
  }

  private toProfile(
    tenant: NonNullable<
      Awaited<ReturnType<TenantsRepository['findProfileById']>>
    >,
  ): TenantProfile {
    const branding = (tenant.branding ?? {}) as Record<string, string>;
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      branding: {
        logoUrl: branding.logoUrl ?? null,
        primaryColor: branding.primaryColor ?? null,
        theme: branding.theme ?? null,
        description: branding.description ?? null,
        address: branding.address ?? null,
        phone: branding.phone ?? null,
        email: branding.email ?? null,
      },
      plan: tenant.subscription?.plan
        ? {
            code: tenant.subscription.plan.code,
            name: tenant.subscription.plan.name,
          }
        : null,
      subscriptionStatus: tenant.subscription?.status ?? null,
    };
  }
}
