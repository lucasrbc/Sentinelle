import { PrismaClient } from '@prisma/client';

// Ré-export du client généré + des types/enums pour tout le monorepo.
export * from '@prisma/client';

// Singleton PrismaClient : évite l'épuisement du pool de connexions lors du
// hot-reload en développement (un seul client réutilisé entre les rechargements).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
