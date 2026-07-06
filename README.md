# Upstock

Multi-tenant SaaS commerce platform — stores manage products, inventory, customers, and orders from a branded storefront under their own subdomain.

- **Platform:** `upstock.my.id` (marketing) · `admin.upstock.my.id` (platform admin) · `{tenant}.upstock.my.id` (store)
- **Backend:** NestJS · Prisma · PostgreSQL · Redis
- **Frontend:** TanStack Start (React 19) · Tailwind v4 · shadcn/ui · TanStack Query
- **Tenancy:** single database, shared schema, `tenant_id` row scoping, subdomain-resolved

> Status: MVP in progress. **Auth, Tenant, Product, and Category** modules are built, tested, and runnable end-to-end with the storefront. Order/Inventory modules are not built yet (see [Roadmap](#roadmap)).

---

## Table of contents
1. [Architecture](#architecture)
2. [Repository layout](#repository-layout)
3. [Tech stack](#tech-stack)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [Multi-tenancy](#multi-tenancy)
7. [Authentication & authorization](#authentication--authorization)
8. [API reference](#api-reference)
9. [Database](#database)
10. [Testing](#testing)
11. [Seeded accounts](#seeded-accounts)
12. [Roadmap](#roadmap)

---

## Architecture

Three frontend surfaces (resolved by host) talk to one NestJS API backed by one PostgreSQL database. Tenant context is derived from the subdomain on every request and enforced through the guard chain and Prisma scoping.

```
 *.upstock.my.id (wildcard DNS + TLS)
        │  Host header / X-Tenant-Slug
        ▼
 ┌─────────────────────────────┐      ┌────────────────────────────────┐
 │  Next-gen web (TanStack)    │ ───▶ │  NestJS API (modular monolith)  │
 │  marketing · admin · store  │ JWT  │  Tenant MW → Auth → Tenant → RBAC│
 └─────────────────────────────┘      │  Auth·Tenant·Product·Category    │
                                       └───────┬───────────────┬──────────┘
                                          Prisma│          Redis│
                                       ┌────────▼───┐   ┌───────▼──────┐
                                       │ PostgreSQL │   │ tenant cache │
                                       └────────────┘   └──────────────┘
```

**Request lifecycle (API):**
`TenantResolverMiddleware` (slug → `req.tenant`) → `AuthGuard` (JWT) → `TenantGuard` (token tenant == request tenant) → `RbacGuard` (`@RequirePermission`) → controller → service → repository → Prisma.

Every error is normalized by a global exception filter into `{ code, message, details }`.

---

## Repository layout

```
upstock/
├── docker-compose.yml          # Postgres + Redis (+ optional api/web profiles)
├── .env.example                # root infra env (compose)
├── DEVELOPMENT.md              # local dev guide
├── README.md
└── apps/
    ├── api/                    # NestJS backend
    │   ├── prisma/             # schema.prisma · migrations · seed.ts
    │   └── src/
    │       ├── main.ts                 # bootstrap: pipes, filter, cookie-parser, CORS
    │       ├── app.module.ts           # root module + tenant middleware
    │       ├── core/                   # prisma, config
    │       ├── common/                 # guards, decorators, filters, middleware, constants
    │       ├── shared/                 # global: audit, tenant cache
    │       └── modules/                # auth · tenants · products · categories
    └── web/                    # TanStack Start frontend (Lovable UI)
        └── src/
            ├── lib/api/        # typed client, config, errors, types
            ├── lib/tenant/     # subdomain → slug resolution
            ├── lib/auth/       # in-memory token store
            ├── services/       # auth · products · tenant
            ├── hooks/          # React Query hooks
            └── routes/         # storefront + admin pages
```

Each API module follows `controller → service → repository → Prisma`. Repositories are the only place Prisma is touched for a domain.

---

## Tech stack

| Layer | Choice |
|---|---|
| API framework | NestJS 10 (modular monolith) |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache / sessions | Redis 7 |
| Auth | JWT access token + rotating refresh token (httpOnly cookie) |
| Passwords | argon2id |
| Frontend | TanStack Start (React 19), TanStack Router + Query |
| Styling | Tailwind v4, shadcn/ui (Radix) |
| Validation | class-validator / class-transformer (API), zod (web) |
| Tests | Jest (unit) |

---

## Quick start

**Prerequisites:** Node 20+, Docker Desktop.

```bash
# 1. infra
cp .env.example .env
docker compose up -d db redis          # Postgres + Redis

# 2. API
cd apps/api
cp .env.example .env                    # then align DATABASE_URL creds with root .env
npm install
npm run prisma:migrate -- --name init   # create + apply migration
npm run db:seed                         # plans, platform admin, demo tenant "acme"
npm run start:dev                       # http://localhost:3001/api/v1

# 3. Web (new terminal)
cd apps/web
cp .env.example .env                    # set VITE_API_URL (see note below)
npm install
npm run dev                             # http://localhost:3000
```

Open **`http://acme.lvh.me:3000`** (the demo tenant). `lvh.me` resolves all subdomains to `127.0.0.1` — no hosts-file edits.

> **Cookie note:** the refresh cookie is `SameSite=Lax`, so the web app and API must be **same-site**. In dev, point the web app at `VITE_API_URL=http://api.lvh.me:3001/api/v1` so `acme.lvh.me` ↔ `api.lvh.me` share the `lvh.me` site and the cookie flows. Pure `localhost:3000 ↔ localhost:3001` also works (same site).

See **[DEVELOPMENT.md](DEVELOPMENT.md)** for the full guide and a manual-testing flow.

---

## Environment variables

### Root `.env` (docker compose)
| Var | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `postgres` / `upstock` | DB container creds |
| `POSTGRES_PORT` / `REDIS_PORT` | `5432` / `6379` | published ports |
| `API_PORT` / `WEB_PORT` | `3001` / `3000` | app ports |

### `apps/api/.env`
| Var | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/upstock?schema=public` | Prisma connection (**must match root creds**) |
| `NODE_ENV` | `development` | toggles secure cookies in prod |
| `PORT` | `3001` | listen port |
| `API_PREFIX` | `/api/v1` | global route prefix |
| `ROOT_DOMAIN` | `upstock.my.id` | tenant subdomain parsing + CORS |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_TTL` | — / `15m` | access token signing |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_TTL` | — / `30d` | refresh token |
| `REDIS_URL` | `redis://localhost:6379` | cache / rate limiting |
| `CORS_ORIGINS` | `http://localhost:3000` | extra explicit allow-list |
| `COOKIE_DOMAIN` | _(unset)_ | optional shared cookie domain (e.g. `.upstock.my.id`) |
| `COOKIE_SAMESITE` | `lax` | refresh cookie SameSite |
| `REFRESH_COOKIE_NAME` | `upstock_rt` | refresh cookie name |

### `apps/web/.env`
| Var | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://api.lvh.me:3001/api/v1` | API base URL |
| `VITE_DEFAULT_TENANT` | `acme` | fallback tenant (localhost / SSR) |
| `VITE_ROOT_DOMAIN` | `upstock.my.id` | subdomain extraction in prod |

---

## Multi-tenancy

- **Resolution:** `TenantResolverMiddleware` reads `X-Tenant-Slug` (sent by the web app) or the host subdomain → looks up the tenant (Redis-cached) → attaches `req.tenant = { tenantId, tenantSlug, status }`. Unknown slug → `404 TENANT_NOT_FOUND`. Reserved labels (`admin`, `www`, `api`, …) resolve to no tenant.
- **Isolation:** every tenant-owned table carries `tenant_id`; the `TenantGuard` rejects any token whose tenant ≠ the request tenant (`403 TENANT_MISMATCH`), independently of role.
- **Cross-tenant access** returns `404` (not `403`) to avoid leaking existence.
- **CORS** allows `localhost`, `*.lvh.me` (any port), and `https://*.upstock.my.id` with credentials.

---

## Authentication & authorization

**Three identity scopes:** `platform` (admin), `tenant` (owner/admin/staff), `customer` (tenant-scoped).

- **Access token:** short-lived JWT (claims: `sub`, `role`, `scope`, `tenantId`, `tokenVersion`), held in memory by the web app.
- **Refresh token:** opaque, **only its SHA-256 hash is stored**; delivered as an `httpOnly` cookie. Rotated on every refresh with **reuse detection** (a replayed token revokes the whole family).
- **Password reset:** single-use, expiring token; bumps `tokenVersion` to revoke all sessions.

**RBAC:** routes declare `@RequirePermission('product:write')`; roles map to permission sets in [`roles.ts`](apps/api/src/common/constants/roles.ts).

| Role | Key permissions |
|---|---|
| `PLATFORM_ADMIN` | `tenant:manage`, `tenant:suspend` |
| `TENANT_OWNER` / `TENANT_ADMIN` | `settings:write`, `product:write`, `product:delete`, `category:write`, `category:delete` |
| `STAFF` | `product:write`, `category:write` |
| `CUSTOMER` | own cart/orders/profile |

---

## API reference

Base URL: `/api/v1`. All tenant/customer routes require the `X-Tenant-Slug` header; protected routes require `Authorization: Bearer <accessToken>`.

### Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password, scope }` → access token + sets refresh cookie |
| POST | `/auth/refresh` | cookie | rotates refresh, returns new access token |
| POST | `/auth/logout` | bearer | revokes token family |
| GET | `/auth/me` | bearer | current principal |
| POST | `/auth/password/reset-request` | public | always `202` (no enumeration) |
| POST | `/auth/password/reset` | public | single-use token |

### Tenant
| Method | Path | Auth |
|---|---|---|
| POST | `/tenants` | public (signup) |
| GET | `/tenant` | tenant owner/admin/staff |
| PATCH | `/tenant` | `settings:write` |
| GET | `/tenant/branding` | public (storefront theming) |
| GET | `/platform/tenants` | `tenant:manage` |
| PATCH | `/platform/tenants/:id/status` | `tenant:suspend` |

### Products
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/products` | public | active only; paginated; `?categoryId&search&page&limit` |
| GET | `/products/:slug` | public | detail |
| POST | `/products` | `product:write` | enforces plan product limit |
| PATCH | `/products/:id` | `product:write` | |
| DELETE | `/products/:id` | `product:delete` | soft delete |

### Categories
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/categories` | public | tenant-scoped, ordered, with `productCount` |
| POST | `/categories` | `category:write` | tree (optional `parentId`) |
| PATCH | `/categories/:id` | `category:write` | |
| DELETE | `/categories/:id` | `category:delete` | soft delete; detaches children + products |

**Error envelope:** `{ "code": "PLAN_LIMIT_EXCEEDED", "message": "...", "details": {...} }`.
Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `TENANT_MISMATCH`, `TENANT_SUSPENDED`, `TENANT_NOT_FOUND`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `PLAN_LIMIT_EXCEEDED`.

---

## Database

Single PostgreSQL database, shared schema, `tenant_id` discriminator. Money is stored in **minor units** (integer) + `currency`.

Core models: `Tenant`, `Plan`, `Subscription`, `User` (tenant staff), `PlatformUser`, `Customer`, `Product`, `Category`, `InventoryItem`, `RefreshToken`, `PasswordResetToken`, `AuditLog`.

```bash
cd apps/api
npm run prisma:migrate -- --name <change>   # dev: create + apply migration
npm run prisma:deploy                        # CI/prod: apply pending
npm run prisma:reset                         # drop + re-migrate + reseed
npm run prisma:studio                        # GUI
npm run db:seed                              # idempotent seed
```

---

## Testing

```bash
cd apps/api
npm test            # unit tests (repositories mocked — no DB needed)
npm run test:cov    # coverage
npx tsc --noEmit    # typecheck
```

Current: **88 unit tests across 8 suites** (auth, guards, tenants, products, categories) — all green. The web app typechecks with `npx tsc --noEmit` in `apps/web`.

---

## Seeded accounts

Password for **all** seeded accounts: `Password123!`

| Account | Email | Scope |
|---|---|---|
| Platform admin | `admin@upstock.my.id` | platform |
| Tenant owner | `owner@acme.test` | tenant `acme` |
| Customer | `buyer@acme.test` | customer (tenant `acme`) |

Demo tenant `acme` ships with a `Sandals` category and two in-stock products. Plans: `starter`, `growth`, `pro`.

---

## Roadmap

**Done:** infra + bootstrap (CORS, cookies, validation, exception filter, tenant middleware), Auth, Tenant, Product, Category modules; storefront catalog/detail + admin auth wired to the API.

**Next:**
- **Order** module — checkout with transactional, oversell-safe stock decrement; order lifecycle.
- **Inventory** module — stock adjustments + movement ledger, low-stock alerts.
- Wire frontend categories (service + hook + product `categoryId` filter), then orders/inventory/reports admin screens.
- Subscription/billing automation, staff sub-accounts, custom domains, analytics (see product roadmap).

**Known gaps:** storefront home "featured/best-seller" sections, category filtering, and cart→checkout still use mock data pending the modules above. Product model has no variants (sizes/colors) yet.
