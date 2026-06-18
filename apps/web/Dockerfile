# Web Sentinelle (Next.js) — image de production (sortie standalone).
# Contexte de build : racine du monorepo.
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.exemple.fr \
#     -t sentinelle-web .

# ---- Build ----
FROM node:20-slim AS build
RUN corepack enable
WORKDIR /repo

# Variables publiques (injectées au build car inlinées par Next).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sentinelle/web build

# ---- Runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Sortie standalone : serveur + dépendances minimales tracées.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
