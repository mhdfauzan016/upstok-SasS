import {
  DEFAULT_TENANT_SLUG,
  RESERVED_SUBDOMAINS,
  ROOT_DOMAIN,
} from "../api/config";

/**
 * Resolve the active tenant slug from the current host.
 *
 *   acme.upstock.my.id   → "acme"
 *   acme.lvh.me:3000     → "acme"   (local dev wildcard host)
 *   localhost / www / admin / apex → DEFAULT_TENANT_SLUG
 *
 * On the server (SSR) `window` is undefined; we fall back to the default tenant.
 * Production SSR should read the request Host header — see README note.
 */
export function resolveTenantSlug(hostname?: string): string {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : undefined);

  if (!host) return DEFAULT_TENANT_SLUG;

  // Strip port if present and split labels.
  const cleanHost = host.split(":")[0];
  const labels = cleanHost.split(".");

  // bare host (localhost) or apex with no subdomain
  if (labels.length < 2) return DEFAULT_TENANT_SLUG;

  const candidate = labels[0];
  if (RESERVED_SUBDOMAINS.has(candidate)) return DEFAULT_TENANT_SLUG;

  // If the host matches the known root domain, the first label is the tenant.
  if (cleanHost.endsWith(ROOT_DOMAIN) || cleanHost.endsWith("lvh.me")) {
    return candidate;
  }

  // Unknown host shape (e.g. preview URLs) → default tenant.
  return DEFAULT_TENANT_SLUG;
}

/** True when the current host targets the platform admin surface. */
export function isAdminHost(hostname?: string): boolean {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  return host.split(":")[0].split(".")[0] === "admin";
}
