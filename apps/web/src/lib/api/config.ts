/**
 * API + tenant configuration. Values come from Vite env (VITE_*) with safe
 * local-dev defaults so the app runs without a .env during development.
 */
const env = (import.meta as unknown as { env: Record<string, string | undefined> })
  .env;

export const API_BASE_URL =
  env?.VITE_API_URL ?? "http://localhost:3001/api/v1";

/** Fallback tenant when no subdomain is present (e.g. localhost / SSR). */
export const DEFAULT_TENANT_SLUG = env?.VITE_DEFAULT_TENANT ?? "acme";

/** Root domain used to strip the tenant subdomain from the host. */
export const ROOT_DOMAIN = env?.VITE_ROOT_DOMAIN ?? "upstock.my.id";

/** Hosts/labels that are never a tenant. */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "app",
  "localhost",
]);
