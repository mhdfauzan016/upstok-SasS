# Production image for the NestJS API. Multi-stage: build → slim runtime.
FROM node:20-slim AS builder
WORKDIR /app

# Build tooling for argon2 native bindings + openssl for Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma query engine needs openssl at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Carry over installed deps (incl. compiled argon2 + generated Prisma client
# + the prisma CLI used for `migrate deploy`).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001

# Apply pending migrations, then start. (Prisma deploy is safe to re-run.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
