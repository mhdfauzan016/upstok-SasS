# Production image for the TanStack Start (SSR) web app.
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_* values are compiled into the bundle at build time, so they must be
# provided as build args (not runtime env).
ARG VITE_API_URL
ARG VITE_ROOT_DOMAIN
ARG VITE_DEFAULT_TENANT
ENV VITE_API_URL=$VITE_API_URL \
    VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN \
    VITE_DEFAULT_TENANT=$VITE_DEFAULT_TENANT

RUN npm run build

# ---- runtime ----
# Nitro bundles the server + deps into .output, so the runtime needs no node_modules.
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
