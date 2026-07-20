import { Injectable } from '@nestjs/common';
import { AuthScope } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export type Scope = 'platform' | 'tenant' | 'customer';

export interface SubjectRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  role: string;
  status: string;
  tokenVersion: number;
  tenantId: string | null;
}

export interface CreateRefreshTokenParams {
  subjectId: string;
  subjectScope: Scope;
  tenantId: string | null;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

export interface CreateResetTokenParams {
  subjectId: string;
  subjectScope: Scope;
  tenantId: string | null;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Subject lookup (scope-specific) ----

  async findPlatformUserByEmail(email: string): Promise<SubjectRecord | null> {
    const u = await this.prisma.platformUser.findUnique({ where: { email } });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.passwordHash,
      role: u.role,
      status: u.status,
      tokenVersion: u.tokenVersion,
      tenantId: null,
    };
  }

  async findTenantUserByEmail(
    tenantId: string,
    email: string,
  ): Promise<SubjectRecord | null> {
    const u = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.passwordHash,
      role: u.role,
      status: u.status,
      tokenVersion: u.tokenVersion,
      tenantId: u.tenantId,
    };
  }

  async findCustomerByEmail(
    tenantId: string,
    email: string,
  ): Promise<SubjectRecord | null> {
    const c = await this.prisma.customer.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (!c) return null;
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      passwordHash: c.passwordHash,
      role: 'CUSTOMER',
      status: c.status,
      tokenVersion: c.tokenVersion,
      tenantId: c.tenantId,
    };
  }

  /** Customer self-registration: creates a `pending` account. */
  createCustomer(params: {
    tenantId: string;
    email: string;
    name: string;
    phone: string;
    passwordHash: string;
  }) {
    return this.prisma.customer.create({
      data: {
        tenantId: params.tenantId,
        email: params.email,
        name: params.name,
        phone: params.phone,
        passwordHash: params.passwordHash,
        status: 'pending',
      },
      select: { id: true },
    });
  }

  async getSubjectById(
    scope: Scope,
    id: string,
  ): Promise<SubjectRecord | null> {
    if (scope === 'platform') {
      const u = await this.prisma.platformUser.findUnique({ where: { id } });
      return u
        ? {
            id: u.id,
            email: u.email,
            name: u.name,
            passwordHash: u.passwordHash,
            role: u.role,
            status: u.status,
            tokenVersion: u.tokenVersion,
            tenantId: null,
          }
        : null;
    }
    if (scope === 'tenant') {
      const u = await this.prisma.user.findFirst({
        where: { id, deletedAt: null },
      });
      return u
        ? {
            id: u.id,
            email: u.email,
            name: u.name,
            passwordHash: u.passwordHash,
            role: u.role,
            status: u.status,
            tokenVersion: u.tokenVersion,
            tenantId: u.tenantId,
          }
        : null;
    }
    const c = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    return c
      ? {
          id: c.id,
          email: c.email,
          name: c.name,
          passwordHash: c.passwordHash,
          role: 'CUSTOMER',
          status: c.status,
          tokenVersion: c.tokenVersion,
          tenantId: c.tenantId,
        }
      : null;
  }

  // ---- Refresh tokens ----

  createRefreshToken(params: CreateRefreshTokenParams) {
    return this.prisma.refreshToken.create({
      data: {
        subjectId: params.subjectId,
        subjectScope: params.subjectScope as AuthScope,
        tenantId: params.tenantId,
        tokenHash: params.tokenHash,
        familyId: params.familyId,
        expiresAt: params.expiresAt,
      },
    });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeFamily(familyId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForSubject(scope: Scope, subjectId: string) {
    return this.prisma.refreshToken.updateMany({
      where: {
        subjectId,
        subjectScope: scope as AuthScope,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  // ---- Password reset ----

  createResetToken(params: CreateResetTokenParams) {
    return this.prisma.passwordResetToken.create({
      data: {
        subjectId: params.subjectId,
        subjectScope: params.subjectScope as AuthScope,
        tenantId: params.tenantId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
      },
    });
  }

  findResetTokenByHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  markResetUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  /** Set a new password hash and bump tokenVersion to revoke all sessions. */
  async setPassword(
    scope: Scope,
    subjectId: string,
    passwordHash: string,
  ): Promise<void> {
    if (scope === 'platform') {
      await this.prisma.platformUser.update({
        where: { id: subjectId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
    } else if (scope === 'tenant') {
      await this.prisma.user.update({
        where: { id: subjectId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
    } else {
      await this.prisma.customer.update({
        where: { id: subjectId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
    }
  }
}
