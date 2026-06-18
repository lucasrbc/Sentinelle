# API Sentinelle (NestJS) — image de production.
# Contexte de build : racine du monorepo.
#   docker build -f apps/api/Dockerfile -t sentinelle-api .

# ---- Build ----
FROM node:20-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sentinelle/db build
RUN pnpm --filter @sentinelle/api build

# Dossier autonome (dépendances de prod aplaties) pour l'API.
RUN pnpm --filter @sentinelle/api deploy --prod /app

# ---- Runtime ----
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
