import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandView } from './entities/brand.entity';
import { BrandsRepository } from './brands.repository';

type BrandRow = NonNullable<
  Awaited<ReturnType<BrandsRepository['findByIdInTenant']>>
>;

@Injectable()
export class BrandsService {
  constructor(
    private readonly repo: BrandsRepository,
    private readonly audit: AuditService,
  ) {}

  /** GET /brands — public, tenant-scoped, ordered. */
  async list(tenantId: string): Promise<BrandView[]> {
    const rows = await this.repo.listByTenant(tenantId);
    return rows.map((r) => this.toView(r));
  }

  /** POST /brands — create (console). */
  async create(
    tenantId: string,
    dto: CreateBrandDto,
    actor: AuthUser,
  ): Promise<BrandView> {
    const slug = (dto.slug ?? this.slugify(dto.name)).toLowerCase();
    if (await this.repo.slugTaken(tenantId, slug)) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'slug already exists',
        details: { slug },
      });
    }

    let brand: BrandRow;
    try {
      brand = await this.repo.create({
        tenantId,
        name: dto.name,
        slug,
        position: dto.position ?? 0,
      });
    } catch (err) {
      throw this.mapUniqueViolation(err, slug);
    }

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'brand.created',
      targetType: 'brand',
      targetId: brand.id,
      metadata: { slug },
    });

    return this.toView(brand);
  }

  /** PATCH /brands/:id — update (console). */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateBrandDto,
    actor: AuthUser,
  ): Promise<BrandView> {
    if (Object.keys(dto).length === 0) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'at least one field must be provided',
      });
    }

    const existing = await this.repo.findByIdInTenant(tenantId, id);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'brand not found',
      });
    }

    const nextSlug = (dto.slug ?? existing.slug).toLowerCase();
    if (
      dto.slug !== undefined &&
      (await this.repo.slugTaken(tenantId, nextSlug, id))
    ) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'slug already exists',
        details: { slug: nextSlug },
      });
    }

    const data: Prisma.BrandUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = nextSlug;
    if (dto.position !== undefined) data.position = dto.position;

    let updated: BrandRow;
    try {
      updated = await this.repo.update(id, data);
    } catch (err) {
      throw this.mapUniqueViolation(err, nextSlug);
    }

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'brand.updated',
      targetType: 'brand',
      targetId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toView(updated);
  }

  /** DELETE /brands/:id — soft delete, detach products. */
  async remove(tenantId: string, id: string, actor: AuthUser): Promise<void> {
    const existing = await this.repo.findByIdInTenant(tenantId, id);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'brand not found',
      });
    }

    await this.repo.softDelete(tenantId, id);
    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'brand.deleted',
      targetType: 'brand',
      targetId: id,
    });
  }

  // ---- helpers ----

  private mapUniqueViolation(err: unknown, slug: string) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new ConflictException({
        code: 'CONFLICT',
        message: 'slug already exists',
        details: { slug },
      });
    }
    return err;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  private toView(row: BrandRow): BrandView {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      position: row.position,
      productCount: row._count.products,
    };
  }
}
