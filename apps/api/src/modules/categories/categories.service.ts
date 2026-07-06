import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryView } from './entities/category.entity';
import { CategoriesRepository } from './categories.repository';

type CategoryRow = NonNullable<
  Awaited<ReturnType<CategoriesRepository['findByIdInTenant']>>
>;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    private readonly audit: AuditService,
  ) {}

  /** GET /categories — public, tenant-scoped, ordered. */
  async list(tenantId: string): Promise<CategoryView[]> {
    const rows = await this.repo.listByTenant(tenantId);
    return rows.map((r) => this.toView(r));
  }

  /** POST /categories — create (console). */
  async create(
    tenantId: string,
    dto: CreateCategoryDto,
    actor: AuthUser,
  ): Promise<CategoryView> {
    const parentId = dto.parentId ?? null;
    if (parentId) await this.assertParent(tenantId, parentId);

    const slug = (dto.slug ?? this.slugify(dto.name)).toLowerCase();
    if (await this.repo.slugTakenUnderParent(tenantId, parentId, slug)) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'slug already exists under this parent',
        details: { slug },
      });
    }

    let category: CategoryRow;
    try {
      category = await this.repo.create({
        tenantId,
        name: dto.name,
        slug,
        parentId: dto.parentId,
        position: dto.position ?? 0,
      });
    } catch (err) {
      throw this.mapUniqueViolation(err, slug);
    }

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'category.created',
      targetType: 'category',
      targetId: category.id,
      metadata: { slug, parentId },
    });

    return this.toView(category);
  }

  /** PATCH /categories/:id — update (console). */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateCategoryDto,
    actor: AuthUser,
  ): Promise<CategoryView> {
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
        message: 'category not found',
      });
    }

    // Parent validation: must exist in tenant, can't be itself.
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'a category cannot be its own parent',
        });
      }
      await this.assertParent(tenantId, dto.parentId);
    }

    const nextParent =
      dto.parentId !== undefined ? dto.parentId : existing.parentId;
    const nextSlug = (dto.slug ?? existing.slug).toLowerCase();
    if (
      (dto.slug !== undefined || dto.parentId !== undefined) &&
      (await this.repo.slugTakenUnderParent(
        tenantId,
        nextParent,
        nextSlug,
        id,
      ))
    ) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'slug already exists under this parent',
        details: { slug: nextSlug },
      });
    }

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = nextSlug;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.parentId !== undefined) {
      data.parent =
        dto.parentId === null
          ? { disconnect: true }
          : { connect: { id: dto.parentId } };
    }

    let updated: CategoryRow;
    try {
      updated = await this.repo.update(id, data);
    } catch (err) {
      throw this.mapUniqueViolation(err, nextSlug);
    }

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'category.updated',
      targetType: 'category',
      targetId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toView(updated);
  }

  /** DELETE /categories/:id — soft delete, detach children + products. */
  async remove(tenantId: string, id: string, actor: AuthUser): Promise<void> {
    const existing = await this.repo.findByIdInTenant(tenantId, id);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'category not found',
      });
    }

    await this.repo.softDelete(tenantId, id);
    await this.audit.record({
      tenantId,
      actorId: actor.id,
      actorScope: 'tenant',
      action: 'category.deleted',
      targetType: 'category',
      targetId: id,
    });
  }

  // ---- helpers ----

  private async assertParent(tenantId: string, parentId: string) {
    const parent = await this.repo.findByIdInTenant(tenantId, parentId);
    if (!parent) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'parentId does not belong to this tenant',
        details: { parentId },
      });
    }
  }

  private mapUniqueViolation(err: unknown, slug: string) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new ConflictException({
        code: 'CONFLICT',
        message: 'slug already exists under this parent',
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

  private toView(row: CategoryRow): CategoryView {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      position: row.position,
      productCount: row._count.products,
    };
  }
}
