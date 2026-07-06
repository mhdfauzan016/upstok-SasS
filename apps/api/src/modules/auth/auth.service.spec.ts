import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../shared/audit/audit.service';
import type { TenantContext } from '../../common/decorators';
import { AuthRepository, SubjectRecord } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthScopeInput } from './dto/login.dto';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let tokens: jest.Mocked<TokenService>;
  let passwords: jest.Mocked<PasswordService>;
  let audit: jest.Mocked<AuditService>;

  const tenantCtx: TenantContext = {
    tenantId: 'tenant-1',
    tenantSlug: 'acme',
    status: 'active',
  };

  const tenantSubject: SubjectRecord = {
    id: 'user-1',
    email: 'owner@store.com',
    name: 'Owner',
    passwordHash: 'hash',
    role: 'TENANT_OWNER',
    status: 'active',
    tokenVersion: 0,
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findPlatformUserByEmail: jest.fn(),
            findTenantUserByEmail: jest.fn(),
            findCustomerByEmail: jest.fn(),
            getSubjectById: jest.fn(),
            createRefreshToken: jest.fn(),
            findRefreshTokenByHash: jest.fn(),
            revokeRefreshToken: jest.fn(),
            revokeFamily: jest.fn(),
            revokeAllForSubject: jest.fn(),
            createResetToken: jest.fn(),
            findResetTokenByHash: jest.fn(),
            markResetUsed: jest.fn(),
            setPassword: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            signAccessToken: jest.fn().mockReturnValue('access.jwt'),
            generateRefreshToken: jest.fn().mockReturnValue({
              raw: 'raw-refresh',
              hash: 'hash-refresh',
              familyId: 'fam-1',
            }),
            rotateRefreshToken: jest
              .fn()
              .mockReturnValue({ raw: 'raw-2', hash: 'hash-2' }),
            hashToken: jest.fn((t: string) => `H(${t})`),
          },
        },
        {
          provide: PasswordService,
          useValue: { hash: jest.fn(), verify: jest.fn() },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    repo = moduleRef.get(AuthRepository);
    tokens = moduleRef.get(TokenService);
    passwords = moduleRef.get(PasswordService);
    audit = moduleRef.get(AuditService);
  });

  describe('login', () => {
    it('issues tokens and persists a refresh family for a tenant user', async () => {
      repo.findTenantUserByEmail.mockResolvedValue(tenantSubject);
      passwords.verify.mockResolvedValue(true);

      const result = await service.login(
        {
          email: 'Owner@Store.com',
          password: 'sup3rsecret',
          scope: AuthScopeInput.TENANT,
        },
        tenantCtx,
      );

      expect(repo.findTenantUserByEmail).toHaveBeenCalledWith(
        'tenant-1',
        'owner@store.com',
      );
      expect(repo.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: 'user-1',
          subjectScope: 'tenant',
          tenantId: 'tenant-1',
          tokenHash: 'hash-refresh',
          familyId: 'fam-1',
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
      expect(result).toEqual({
        accessToken: 'access.jwt',
        refreshToken: 'raw-refresh',
        user: expect.objectContaining({ id: 'user-1', scope: 'tenant' }),
      });
    });

    it('rejects tenant-scope login without tenant context (400)', async () => {
      await expect(
        service.login({
          email: 'a@b.com',
          password: 'sup3rsecret',
          scope: AuthScopeInput.TENANT,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns uniform 401 for unknown account', async () => {
      repo.findTenantUserByEmail.mockResolvedValue(null);
      await expect(
        service.login(
          { email: 'x@b.com', password: 'sup3rsecret', scope: AuthScopeInput.TENANT },
          tenantCtx,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns 401 on wrong password (no token issued)', async () => {
      repo.findTenantUserByEmail.mockResolvedValue(tenantSubject);
      passwords.verify.mockResolvedValue(false);
      await expect(
        service.login(
          { email: 'owner@store.com', password: 'wrong-pass', scope: AuthScopeInput.TENANT },
          tenantCtx,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.createRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a disabled account with 401', async () => {
      repo.findTenantUserByEmail.mockResolvedValue({
        ...tenantSubject,
        status: 'disabled',
      });
      await expect(
        service.login(
          { email: 'owner@store.com', password: 'sup3rsecret', scope: AuthScopeInput.TENANT },
          tenantCtx,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const activeToken = {
      id: 'rt-1',
      familyId: 'fam-1',
      subjectId: 'user-1',
      subjectScope: 'tenant',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    };

    it('rotates the token and mints a new access token', async () => {
      repo.findRefreshTokenByHash.mockResolvedValue(activeToken as any);
      repo.getSubjectById.mockResolvedValue(tenantSubject);

      const result = await service.refresh('raw-refresh');

      expect(repo.revokeRefreshToken).toHaveBeenCalledWith('rt-1');
      expect(repo.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: 'fam-1', tokenHash: 'hash-2' }),
      );
      expect(result).toEqual({
        accessToken: 'access.jwt',
        refreshToken: 'raw-2',
      });
    });

    it('detects reuse of a revoked token and kills the family', async () => {
      repo.findRefreshTokenByHash.mockResolvedValue({
        ...activeToken,
        revokedAt: new Date(),
      } as any);

      await expect(service.refresh('raw-refresh')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.revokeFamily).toHaveBeenCalledWith('fam-1');
    });

    it('rejects an expired token', async () => {
      repo.findRefreshTokenByHash.mockResolvedValue({
        ...activeToken,
        expiresAt: new Date(Date.now() - 1000),
      } as any);
      await expect(service.refresh('raw-refresh')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an unknown token', async () => {
      repo.findRefreshTokenByHash.mockResolvedValue(null);
      await expect(service.refresh('raw-refresh')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the family for a known token (idempotent)', async () => {
      repo.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        familyId: 'fam-1',
      } as any);
      await service.logout('raw-refresh');
      expect(repo.revokeFamily).toHaveBeenCalledWith('fam-1');
    });

    it('is a no-op when no token is presented', async () => {
      await service.logout(undefined);
      expect(repo.findRefreshTokenByHash).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('creates a reset token for an existing subject', async () => {
      repo.findTenantUserByEmail.mockResolvedValue(tenantSubject);
      await service.requestPasswordReset(
        { email: 'owner@store.com', scope: AuthScopeInput.TENANT },
        tenantCtx,
      );
      expect(repo.createResetToken).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId: 'user-1', subjectScope: 'tenant' }),
      );
    });

    it('silently accepts an unknown account (no enumeration)', async () => {
      repo.findTenantUserByEmail.mockResolvedValue(null);
      await expect(
        service.requestPasswordReset(
          { email: 'ghost@store.com', scope: AuthScopeInput.TENANT },
          tenantCtx,
        ),
      ).resolves.toBeUndefined();
      expect(repo.createResetToken).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('rotates the password, consumes the token and revokes sessions', async () => {
      repo.findResetTokenByHash.mockResolvedValue({
        id: 'prt-1',
        subjectId: 'user-1',
        subjectScope: 'tenant',
        tenantId: 'tenant-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      } as any);
      passwords.hash.mockResolvedValue('new-hash');

      await service.resetPassword({ token: 'reset-tok', newPassword: 'brandnewpass' });

      expect(repo.setPassword).toHaveBeenCalledWith('tenant', 'user-1', 'new-hash');
      expect(repo.markResetUsed).toHaveBeenCalledWith('prt-1');
      expect(repo.revokeAllForSubject).toHaveBeenCalledWith('tenant', 'user-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.password_reset' }),
      );
    });

    it('rejects an already-used token', async () => {
      repo.findResetTokenByHash.mockResolvedValue({
        id: 'prt-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
        subjectScope: 'tenant',
      } as any);
      await expect(
        service.resetPassword({ token: 'reset-tok', newPassword: 'brandnewpass' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.setPassword).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      repo.findResetTokenByHash.mockResolvedValue({
        id: 'prt-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        subjectScope: 'tenant',
      } as any);
      await expect(
        service.resetPassword({ token: 'reset-tok', newPassword: 'brandnewpass' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown token', async () => {
      repo.findResetTokenByHash.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'reset-tok', newPassword: 'brandnewpass' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
