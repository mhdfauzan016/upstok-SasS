import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { AuthUser } from '../../../common/decorators';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  name: string;
  role: string;
  scope: 'platform' | 'tenant' | 'customer';
  tenantId: string | null;
  tokenVersion: number;
}

/**
 * Issues/verifies short-lived access JWTs and mints opaque refresh tokens.
 * Refresh tokens are random secrets; only their SHA-256 hash is persisted, so a
 * DB leak never yields a usable token.
 */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(claims: AccessTokenClaims): string {
    return this.jwt.sign(claims);
  }

  verifyAccessToken(token: string): AuthUser {
    let payload: AccessTokenClaims;
    try {
      payload = this.jwt.verify<AccessTokenClaims>(token);
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'invalid or expired access token',
      });
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      scope: payload.scope,
      tenantId: payload.tenantId,
    };
  }

  /** A new opaque refresh token + its storage hash + a fresh rotation family id. */
  generateRefreshToken(): { raw: string; hash: string; familyId: string } {
    const raw = randomBytes(48).toString('base64url');
    return { raw, hash: this.hashToken(raw), familyId: randomUUID() };
  }

  /** Rotated token within an existing family (reuse same familyId). */
  rotateRefreshToken(): { raw: string; hash: string } {
    const raw = randomBytes(48).toString('base64url');
    return { raw, hash: this.hashToken(raw) };
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
