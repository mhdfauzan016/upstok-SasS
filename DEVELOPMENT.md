# Upstock — Local Development Guide

Monorepo layout:

```
upstock/
├── docker-compose.yml      # Postgres + Redis (+ optional API/web)
├── .env.example            # root infra env (copy → .env)
└── apps/
    ├── api/                # NestJS + Prisma
    └── web/                # Next.js  (created when frontend is scaffolded)
```

## Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres/Redis)
- npm

---

## 1. One-time setup

```bash
# from repo root
cp .env.example .env                      # infra env (Postgres/Redis ports, creds)
cp apps/api/.env.example apps/api/.env    # API env (DATABASE_URL, JWT secrets…)

# start Postgres + Redis
docker compose up -d

# install API deps + generate Prisma client
cd apps/api
npm install
npm run prisma:generate
```

> **Connection strings.** When you run the API **locally** (`npm run start:dev`) it talks to
> `localhost:5432` — the default in `apps/api/.env`. When the API runs **inside compose**
> (`--profile api`), the host is `db` (compose overrides `DATABASE_URL` automatically).

---

## 2. Migration flow

Prisma owns the schema in `apps/api/prisma/schema.prisma`. Migrations are SQL files under
`apps/api/prisma/migrations/`.

| When | Command | What it does |
|---|---|---|
| First time / after editing schema (dev) | `npm run prisma:migrate -- --name <change>` | Creates a new migration, applies it, regenerates the client |
| Teammate pulled new migrations | `npm run prisma:deploy` | Applies pending migrations (no new files) |
| CI / production | `npm run prisma:deploy` | Idempotent apply, never prompts |
| Start over locally | `npm run prisma:reset` | Drops DB, re-applies all migrations, **runs the seed** |
| Inspect data | `npm run prisma:studio` | Opens Prisma Studio GUI |

Create the initial migration (Postgres must be up):

```bash
cd apps/api
npm run prisma:migrate -- --name init
```

Commit the generated `prisma/migrations/**` folder — migrations are source-controlled.

---

## 3. Seed flow

The seed (`apps/api/prisma/seed.ts`) is **idempotent** (upsert-based) — safe to re-run.

```bash
cd apps/api
npm run db:seed
```

`prisma:reset` runs it automatically. It creates:

| Account | Email | Scope |
|---|---|---|
| Platform admin | `admin@upstock.my.id` | platform |
| Tenant owner | `owner@acme.test` (tenant `acme`) | tenant |
| Customer | `buyer@acme.test` (tenant `acme`) | customer |

Password for all seeded accounts: **`Password123!`**
Plans created: `starter`, `growth`, `pro`. Demo tenant `acme` has a `sandals` category and two in-stock products.

---

## 4. Running the apps

### Option A — apps locally, infra in Docker (recommended for dev)

```bash
docker compose up -d            # Postgres + Redis
cd apps/api && npm run start:dev   # API on http://localhost:3001
# (when the web app exists) cd apps/web && npm run dev   # http://localhost:3000
```

### Option B — everything in Docker

```bash
docker compose --profile api up --build     # Postgres + Redis + API (auto-runs migrate deploy)
docker compose --profile full up --build    # + Next.js web  (requires apps/web)
```

---

## 5. Multi-tenant local DNS

Subdomain routing needs wildcard hostnames. Use `lvh.me` (resolves `*.lvh.me` → `127.0.0.1`,
no hosts-file edits):

| Surface | URL |
|---|---|
| Marketing | `http://lvh.me:3000` |
| Platform admin | `http://admin.lvh.me:3000` |
| Tenant storefront | `http://acme.lvh.me:3000` |

The API reads the tenant from the `X-Tenant-Slug` header (sent by the web app) or the
request host. Test the API directly, e.g.:

```bash
# tenant-scoped login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: acme" \
  -d '{"email":"owner@acme.test","password":"Password123!","scope":"tenant"}'

# public catalog for the acme tenant
curl http://localhost:3001/api/v1/products -H "X-Tenant-Slug: acme"
```

---

## 6. Tests & quality

```bash
cd apps/api
npm test            # unit tests (no DB required — repositories are mocked)
npm run test:cov    # with coverage
npx tsc --noEmit    # typecheck
```

---

## 7. Common tasks

| Task | Command |
|---|---|
| Stop infra (keep data) | `docker compose down` |
| Stop infra + wipe data | `docker compose down -v` |
| Tail API logs (compose) | `docker compose logs -f api` |
| DB shell | `docker compose exec db psql -U upstock -d upstock` |
| Reset DB + reseed | `cd apps/api && npm run prisma:reset` |

---

## Troubleshooting

- **`P1001: can't reach database`** — Postgres isn't up (`docker compose up -d`) or
  `DATABASE_URL` host is wrong (`localhost` for local runs, `db` inside compose).
- **`argon2` native build fails in Docker** — handled in `apps/api/Dockerfile.dev`
  (installs `python3 make g++` on alpine).
- **Migration drift** — `npm run prisma:reset` to rebuild from migrations (destroys local data).
