/**
 * Typed runtime configuration sourced from environment variables.
 * `.env` is loaded by `import 'dotenv/config'` at the top of main.ts.
 */

export type SameSite = 'lax' | 'strict' | 'none';

export interface AppConfig {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  apiPrefix: string;
  rootDomain: string;
  cors: {
    /** Explicit allow-list (comma-separated CORS_ORIGINS), in addition to the rules below. */
    explicitOrigins: string[];
  };
  cookie: {
    /** Refresh-cookie name. */
    name: string;
    /** Optional shared domain (e.g. ".upstock.my.id") to span subdomains. */
    domain?: string;
    secure: boolean;
    sameSite: SameSite;
    maxAgeMs: number;
  };
}

export function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  return {
    nodeEnv,
    isProd,
    port: Number(process.env.PORT ?? 3001),
    apiPrefix: process.env.API_PREFIX ?? '/api/v1',
    rootDomain: process.env.ROOT_DOMAIN ?? 'upstock.my.id',
    cors: {
      explicitOrigins: (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    },
    cookie: {
      name: process.env.REFRESH_COOKIE_NAME ?? 'upstock_rt',
      domain: process.env.COOKIE_DOMAIN || undefined,
      // SameSite=Lax works across subdomains of one registrable site
      // (acme.upstock.my.id ↔ api.upstock.my.id). Secure is required in prod.
      secure: isProd,
      sameSite: (process.env.COOKIE_SAMESITE as SameSite) ?? 'lax',
      maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };
}

export const appConfig = loadConfig();
