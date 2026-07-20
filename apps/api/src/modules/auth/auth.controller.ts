import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  Public,
  TenantContext,
} from '../../common/decorators';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  PasswordResetDto,
  PasswordResetRequestDto,
} from './dto/password-reset.dto';
import { appConfig } from '../../core/config/configuration';

const REFRESH_COOKIE = appConfig.cookie.name;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/login */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, tenant);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  /** POST /auth/register — public customer self-registration (pending). */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @CurrentTenant() tenant: TenantContext | undefined,
  ) {
    await this.auth.register(dto, tenant);
    return { registered: true };
  }

  /** POST /auth/refresh */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(this.readRefreshCookie(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  /** POST /auth/logout */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(this.readRefreshCookie(req));
    this.clearRefreshCookie(res);
  }

  /** GET /auth/me */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  /** POST /auth/password/reset-request */
  @Public()
  @Post('password/reset-request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestReset(
    @Body() dto: PasswordResetRequestDto,
    @CurrentTenant() tenant: TenantContext | undefined,
  ) {
    await this.auth.requestPasswordReset(dto, tenant);
    return { accepted: true };
  }

  /** POST /auth/password/reset */
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: PasswordResetDto) {
    await this.auth.resetPassword(dto);
  }

  // ---- cookie helpers ----

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: appConfig.cookie.secure,
      sameSite: appConfig.cookie.sameSite,
      domain: appConfig.cookie.domain,
      path: '/',
      maxAge: appConfig.cookie.maxAgeMs,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      path: '/',
      domain: appConfig.cookie.domain,
    });
  }

  private readRefreshCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
  }
}
