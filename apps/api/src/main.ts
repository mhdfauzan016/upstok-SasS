import 'dotenv/config'; // must run before AppModule (JwtModule reads env at import)

import {
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { appConfig } from './core/config/configuration';
import { UPLOADS_DIR, UPLOADS_ROUTE } from './common/constants/uploads';

/**
 * Origin allow-list for CORS. Credentials are enabled (httpOnly refresh cookie),
 * so we cannot use a wildcard `*` — each origin must be reflected explicitly.
 *
 * Allowed:
 *   - localhost / 127.0.0.1 on any port           (local dev)
 *   - *.lvh.me on any port                          (local subdomain testing)
 *   - https://{anything}.upstock.my.id + apex       (production wildcard tenants)
 *   - anything in CORS_ORIGINS                       (explicit extra origins)
 */
function isAllowedOrigin(origin: string): boolean {
  if (appConfig.cors.explicitOrigins.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);

    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'lvh.me' || hostname.endsWith('.lvh.me')) return true;

    const root = appConfig.rootDomain;
    if (
      protocol === 'https:' &&
      (hostname === root || hostname.endsWith(`.${root}`))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });

  app.use(cookieParser());
  app.setGlobalPrefix(appConfig.apiPrefix.replace(/^\//, ''));

  // Serve uploaded product images from disk (outside the API prefix), e.g.
  // GET /uploads/products/<tenantId>/<file>.  Directory is created on demand
  // by the upload handler.
  app.useStaticAssets(join(process.cwd(), UPLOADS_DIR), {
    prefix: `/${UPLOADS_ROUTE}`,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Surface field errors through the standard envelope (422 VALIDATION_ERROR).
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'validation failed',
          details: errors.map((e) => ({
            field: e.property,
            constraints: e.constraints,
          })),
        }),
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser requests (curl, server-to-server) have no Origin → allow.
      if (!origin) return callback(null, true);
      return callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  });

  await app.listen(appConfig.port);
  Logger.log(
    `Upstock API listening on http://localhost:${appConfig.port}${appConfig.apiPrefix}`,
    'Bootstrap',
  );
}

void bootstrap();
