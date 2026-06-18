export * from './client';
import type { PrismaClient } from './client';

/** Singleton PrismaClient réutilisable dans tout le monorepo. */
export declare const prisma: PrismaClient;
