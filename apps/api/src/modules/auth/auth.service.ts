import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthUser, TenantContext } from '../../common/decorators';
import { AuthRepository, Scope, SubjectRecord } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import {
  PasswordResetDto,
  PasswordResetRequestDto,
} from './dto/password-reset.dto';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repo: AuthRepository,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  /** POST /auth/login */
  async login(dto: LoginDto, tenant?: TenantContext): Promise<AuthResult> {
    const scope = dto.scope as unknown as Scope;
    const email = dto.email.toLowerCase();

    if (scope !== 'platform' && !tenant) {
      throw new BadRequestException({
        code: 'TENANT_REQUIRED',
        message: 'X-Tenant-Slug is required for this scope',
      });
    }

    const subject = await this.resolveSubject(scope, email, tenant);

    // Uniform failure: never reveal whether the account exists.
    if (!subject || !subject.passwordHash || subject.status !== 'active') {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'invalid credentials',
      });
    }

    const ok = await this.passwords.verify(subject.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'invalid credentials',
      });
    }

    const result = await this.issueTokens(scope, subject);

    await this.audit.record({
      tenantId: subject.tenantId,
      actorId: subject.id,
      actorScope: scope,
      action: 'auth.login',
      targetType: scope,
      targetId: subject.id,
    });

    return result;
  }

  /** POST /auth/refresh — rotation with reuse detection. */
  async refresh(rawToken?: string): Promise<Omit<AuthResult, 'user'>> {
    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'missing refresh token',
      });
    }

    const hash = this.tokens.hashToken(rawToken);
    const stored = await this.repo.findRefreshTokenByHash(hash);

    if (!stored) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'invalid refresh token',
      });
    }

    // Reuse of an already-rotated/revoked token → compromise: kill the family.
    if (stored.revokedAt) {
      await this.repo.revokeFamily(stored.familyId);
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'refresh token reuse detected',
      });
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'refresh token expired',
      });
    }

    const scope = stored.subjectScope as Scope;
    const subject = await this.repo.getSubjectById(scope, stored.subjectId);
    if (!subject || subject.status !== 'active') {
      await this.repo.revokeFamily(stored.familyId);
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'account is no longer active',
      });
    }

    // Rotate: revoke the presented token, mint a new one in the same family.
    await this.repo.revokeRefreshToken(stored.id);
    const rotated = this.tokens.rotateRefreshToken();
    await this.repo.createRefreshToken({
      subjectId: subject.id,
      subjectScope: scope,
      tenantId: subject.tenantId,
      tokenHash: rotated.hash,
      familyId: stored.familyId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    const accessToken = this.tokens.signAccessToken({
      sub: subject.id,
      email: subject.email,
      name: subject.name,
      role: subject.role,
      scope,
      tenantId: subject.tenantId,
      tokenVersion: subject.tokenVersion,
    });

    return { accessToken, refreshToken: rotated.raw };
  }

  /** POST /auth/logout — revoke the whole token family. Idempotent. */
  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    const stored = await this.repo.findRefreshTokenByHash(
      this.tokens.hashToken(rawToken),
    );
    if (stored) {
      await this.repo.revokeFamily(stored.familyId);
    }
  }

  /** GET /auth/me */
  me(user: AuthUser): AuthUser {
    return user;
  }

  /** POST /auth/password/reset-request — always 202, no enumeration. */
  async requestPasswordReset(
    dto: PasswordResetRequestDto,
    tenant?: TenantContext,
  ): Promise<void> {
    const scope = dto.scope as unknown as Scope;
    if (scope !== 'platform' && !tenant) return; // silently accept

    const subject = await this.resolveSubject(
      scope,
      dto.email.toLowerCase(),
      tenant,
    );
    if (!subject) return; // do not reveal absence

    const raw = this.tokens.rotateRefreshToken().raw;
    await this.repo.createResetToken({
      subjectId: subject.id,
      subjectScope: scope,
      tenantId: subject.tenantId,
      tokenHash: this.tokens.hashToken(raw),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    // In production this is queued to the mail service.
    this.logger.log(`Password reset issued for ${scope}:${subject.id}`);
  }

  /** POST /auth/password/reset — consume single-use token, rotate password. */
  async resetPassword(dto: PasswordResetDto): Promise<void> {
    const stored = await this.repo.findResetTokenByHash(
      this.tokens.hashToken(dto.token),
    );

    if (!stored || stored.usedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_RESET_TOKEN',
        message: 'reset token is invalid or expired',
      });
    }

    const scope = stored.subjectScope as Scope;
    const passwordHash = await this.passwords.hash(dto.newPassword);

    await this.repo.setPassword(scope, stored.subjectId, passwordHash);
    await this.repo.markResetUsed(stored.id);
    await this.repo.revokeAllForSubject(scope, stored.subjectId);

    await this.audit.record({
      tenantId: stored.tenantId,
      actorId: stored.subjectId,
      actorScope: scope,
      action: 'auth.password_reset',
      targetType: scope,
      targetId: stored.subjectId,
    });
  }

  // ---- helpers ----

  private resolveSubject(
    scope: Scope,
    email: string,
    tenant?: TenantContext,
  ): Promise<SubjectRecord | null> {
    if (scope === 'platform') {
      return this.repo.findPlatformUserByEmail(email);
    }
    if (scope === 'tenant') {
      return this.repo.findTenantUserByEmail(tenant!.tenantId, email);
    }
    return this.repo.findCustomerByEmail(tenant!.tenantId, email);
  }

  private async issueTokens(
    scope: Scope,
    subject: SubjectRecord,
  ): Promise<AuthResult> {
    const refresh = this.tokens.generateRefreshToken();
    await this.repo.createRefreshToken({
      subjectId: subject.id,
      subjectScope: scope,
      tenantId: subject.tenantId,
      tokenHash: refresh.hash,
      familyId: refresh.familyId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    const user: AuthUser = {
      id: subject.id,
      email: subject.email,
      name: subject.name,
      role: subject.role,
      scope,
      tenantId: subject.tenantId,
    };

    const accessToken = this.tokens.signAccessToken({
      sub: subject.id,
      email: subject.email,
      name: subject.name,
      role: subject.role,
      scope,
      tenantId: subject.tenantId,
      tokenVersion: subject.tokenVersion,
    });

    return { accessToken, refreshToken: refresh.raw, user };
  }
}
