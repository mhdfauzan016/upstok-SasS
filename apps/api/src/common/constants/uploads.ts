/**
 * Local-disk upload configuration for product images (MVP storage).
 *
 * Files are written under `<cwd>/uploads/products/<tenantId>/` and served
 * statically at `/uploads/...` (see main.ts). This is single-instance storage:
 * migrate to object storage (S3/R2) before running more than one API replica.
 */

/** Filesystem directory (relative to process.cwd()) where uploads are stored. */
export const UPLOADS_DIR = 'uploads';

/** Public URL segment the uploads directory is served under. */
export const UPLOADS_ROUTE = 'uploads';

/** Sub-path for product images within the uploads dir. */
export const PRODUCT_IMAGES_SUBDIR = 'products';

/** Max accepted image size in bytes (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Allowed image MIME types. */
export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
