import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../constants/permissions';
import { AuthGuard } from './auth.guard';
import { RbacGuard } from './rbac.guard';
import { TenantGuard } from './tenant.guard';
import { TokenService } from '../../modules/auth/services/token.service';

function ctxFor(req: any, handler = () => {}, cls = class {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const tokens = {
    verifyAccessToken: jest.fn(),
  } as unknown as jest.Mocked<TokenService>;
  let reflector: Reflector;
  let guard: AuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AuthGuard(reflector, tokens);
    jest.clearAllMocks();
  });

  it('allows @Public routes without a token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(guard.canActivate(ctxFor({ headers: {} }))).toBe(true);
  });

  it('rejects a missing bearer token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(() => guard.canActivate(ctxFor({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the verified principal to the request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const user = { id: 'u1', scope: 'tenant', role: 'STAFF', tenantId: 't1' };
    (tokens.verifyAccessToken as jest.Mock).mockReturnValue(user);
    const req: any = { headers: { authorization: 'Bearer abc.def' } };
    expect(guard.canActivate(ctxFor(req))).toBe(true);
    expect(req.user).toBe(user);
    expect(tokens.verifyAccessToken).toHaveBeenCalledWith('abc.def');
  });
});

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  it('allows public requests with no user', () => {
    expect(guard.canActivate(ctxFor({}))).toBe(true);
  });

  it('allows platform-scoped principals (not tenant-bound)', () => {
    expect(
      guard.canActivate(ctxFor({ user: { scope: 'platform' } })),
    ).toBe(true);
  });

  it('blocks a token whose tenant differs from the request tenant', () => {
    const req = {
      user: { scope: 'tenant', tenantId: 'A' },
      tenant: { tenantId: 'B', status: 'active' },
    };
    expect(() => guard.canActivate(ctxFor(req))).toThrow(ForbiddenException);
  });

  it('blocks a suspended tenant', () => {
    const req = {
      user: { scope: 'tenant', tenantId: 'A' },
      tenant: { tenantId: 'A', status: 'suspended' },
    };
    expect(() => guard.canActivate(ctxFor(req))).toThrow(ForbiddenException);
  });

  it('allows a matching, active tenant', () => {
    const req = {
      user: { scope: 'tenant', tenantId: 'A' },
      tenant: { tenantId: 'A', status: 'active' },
    };
    expect(guard.canActivate(ctxFor(req))).toBe(true);
  });
});

describe('RbacGuard', () => {
  let reflector: Reflector;
  let guard: RbacGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RbacGuard(reflector);
  });

  it('allows routes with no permission requirement', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(ctxFor({ user: { role: 'STAFF' } }))).toBe(true);
  });

  it('allows a role that holds the required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(Permission.SETTINGS_WRITE);
    expect(
      guard.canActivate(ctxFor({ user: { role: 'TENANT_OWNER' } })),
    ).toBe(true);
  });

  it('blocks a role lacking the permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(Permission.SETTINGS_WRITE);
    expect(() =>
      guard.canActivate(ctxFor({ user: { role: 'STAFF' } })),
    ).toThrow(ForbiddenException);
  });

  it('rejects when no authenticated user is present', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(Permission.TENANT_MANAGE);
    expect(() => guard.canActivate(ctxFor({}))).toThrow(UnauthorizedException);
  });
});
