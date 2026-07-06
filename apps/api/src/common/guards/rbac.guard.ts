import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators';
import { roleHasPermission } from '../constants/roles';
import type { AuthUser } from '../decorators';

/**
 * Step 3 of the guard chain. Enforces the route's required permission
 * (declared via @RequirePermission) against the actor's role. Routes with no
 * permission requirement pass (authentication alone suffices).
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required) return true;

    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'authentication required',
      });
    }

    if (!roleHasPermission(user.role, required)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `missing required permission: ${required}`,
      });
    }

    return true;
  }
}
