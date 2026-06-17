import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@sentinelle/db';

/**
 * Encapsule le PrismaClient dans le cycle de vie Nest (connexion à l'init,
 * déconnexion propre à l'arrêt). C'est l'unique point d'accès à la base —
 * y compris pour les requêtes SQL brutes PostGIS (cf. SitesService).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
