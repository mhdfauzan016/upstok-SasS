/**
 * Subdomains that may never be claimed as a tenant slug.
 * Enforced at signup (TenantService) and by the tenant resolver middleware.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'www',
  'api',
  'app',
  'mail',
  'smtp',
  'ftp',
  'static',
  'assets',
  'cdn',
  'status',
  'support',
  'help',
  'docs',
  'blog',
  'dashboard',
  'platform',
  'upstock',
]);

/** Slug format: lowercase letters, digits, hyphens; 3–40 chars; no leading/trailing hyphen. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
