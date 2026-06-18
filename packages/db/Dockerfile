# Migrations de base de données (Prisma) — image one-shot.
# Lance `prisma migrate deploy` puis s'arrête. Contexte : racine du monorepo.
#   docker build -f packages/db/Dockerfile -t sentinelle-migrate .

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db ./packages/db

RUN pnpm install --filter @sentinelle/db --frozen-lockfile
RUN pnpm --filter @sentinelle/db generate

WORKDIR /repo/packages/db
# Applique les migrations existantes (extension PostGIS, tables, index GIST).
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]
