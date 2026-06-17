import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health-check de bout en bout : prouve que l'API joint PostgreSQL ET que
 * l'extension PostGIS est disponible (objectif de la PR n°1).
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{
    status: string;
    database: boolean;
    postgis: string | null;
  }> {
    let database = false;
    let postgis: string | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
      const rows =
        await this.prisma.$queryRaw<{ postgis_version: string }[]>`SELECT postgis_version() AS postgis_version`;
      postgis = rows[0]?.postgis_version ?? null;
    } catch {
      database = false;
    }

    return {
      status: database && postgis ? 'ok' : 'degraded',
      database,
      postgis,
    };
  }
}
