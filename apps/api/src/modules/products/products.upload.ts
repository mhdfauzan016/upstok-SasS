import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  PRODUCT_IMAGES_SUBDIR,
  UPLOADS_DIR,
  UPLOADS_ROUTE,
} from '../../common/constants/uploads';

/** Reads the tenant id attached by TenantResolverMiddleware. */
function tenantIdOf(req: Request): string | undefined {
  return (req as Request & { tenant?: { tenantId?: string } }).tenant?.tenantId;
}

/**
 * Multer config for a single product image: per-tenant disk storage, random
 * filename, image-only, size-capped. Directory is created on demand.
 */
export const productImageMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (req, _file, cb) => {
      const tenantId = tenantIdOf(req as Request);
      if (!tenantId) {
        cb(new BadRequestException('missing tenant context'), '');
        return;
      }
      const dir = join(
        process.cwd(),
        UPLOADS_DIR,
        PRODUCT_IMAGES_SUBDIR,
        tenantId,
      );
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'unsupported image type (allowed: jpeg, png, webp, gif)',
        }),
        false,
      );
      return;
    }
    cb(null, true);
  },
};

/** Absolute, publicly-reachable URL for a stored product image. */
export function buildProductImageUrl(
  req: Request,
  tenantId: string,
  filename: string,
): string {
  const host = req.get('host');
  return `${req.protocol}://${host}/${UPLOADS_ROUTE}/${PRODUCT_IMAGES_SUBDIR}/${tenantId}/${filename}`;
}
