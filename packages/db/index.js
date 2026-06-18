// @sentinelle/db — point d'entrée. Ré-exporte le client Prisma généré
// (auto-contenu dans ./client) + un singleton réutilisable.
const client = require('./client');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__sentinellePrisma ??
  new client.PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__sentinellePrisma = prisma;
}

module.exports = { ...client, prisma };
