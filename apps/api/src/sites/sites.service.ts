import { Injectable } from '@nestjs/common';
import {
  HeritageType,
  Prisma,
  ProtectionStatus,
} from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import type {
  SearchAroundDto,
  SearchInBboxDto,
  SiteFiltersDto,
} from './dto/search-sites.dto';

/**
 * Ligne renvoyée par les recherches spatiales. `latitude`/`longitude` sont
 * extraites de la géométrie PostGIS (ST_Y / ST_X) côté SQL — la colonne
 * `location` n'est jamais sérialisée telle quelle.
 */
export interface SiteSearchResult {
  id: string;
  slug: string;
  name: string;
  type: HeritageType;
  commune: string | null;
  department: string | null;
  protectionStatus: ProtectionStatus;
  latitude: number;
  longitude: number;
  /** Distance en mètres au point de recherche (uniquement pour searchAround). */
  distance?: number;
}

export interface UpsertSiteWithPointInput {
  osmId: string;
  slug: string;
  name: string;
  type: HeritageType;
  latitude: number;
  longitude: number;
  commune?: string | null;
  department?: string | null;
  protectionStatus?: ProtectionStatus;
}

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche « dans un rayon de X mètres » via PostGIS (ST_DWithin sur
   * geography), pas un filtrage côté client. Triée par distance croissante.
   */
  async searchAround(params: SearchAroundDto): Promise<SiteSearchResult[]> {
    const { lat, lng, radius, limit, ...filters } = params;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

    return this.prisma.$queryRaw<SiteSearchResult[]>`
      SELECT
        s."id",
        s."slug",
        s."name",
        s."type",
        s."commune",
        s."department",
        s."protectionStatus",
        ST_Y(s."location"::geometry) AS "latitude",
        ST_X(s."location"::geometry) AS "longitude",
        ST_Distance(s."location"::geography, ${point}::geography) AS "distance"
      FROM "HeritageSite" s
      WHERE s."location" IS NOT NULL
        AND ST_DWithin(s."location"::geography, ${point}::geography, ${radius})
        ${this.buildFilters(filters)}
      ORDER BY "distance" ASC
      LIMIT ${limit ?? 100};
    `;
  }

  /**
   * Recherche par bounding box (emprise visible de la carte) via PostGIS
   * (ST_MakeEnvelope + opérateur d'intersection indexé GIST `&&`).
   */
  async searchInBbox(params: SearchInBboxDto): Promise<SiteSearchResult[]> {
    const { minLng, minLat, maxLng, maxLat, limit, ...filters } = params;
    const envelope = Prisma.sql`ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`;

    return this.prisma.$queryRaw<SiteSearchResult[]>`
      SELECT
        s."id",
        s."slug",
        s."name",
        s."type",
        s."commune",
        s."department",
        s."protectionStatus",
        ST_Y(s."location"::geometry) AS "latitude",
        ST_X(s."location"::geometry) AS "longitude"
      FROM "HeritageSite" s
      WHERE s."location" IS NOT NULL
        AND s."location" && ${envelope}
        ${this.buildFilters(filters)}
      ORDER BY s."name" ASC
      LIMIT ${limit ?? 200};
    `;
  }

  /**
   * Upsert d'un site avec écriture de la géométrie en SQL brut.
   * Étape 1 : champs scalaires via Prisma Client (gestion de l'id cuid).
   * Étape 2 : colonne `location` via ST_SetSRID/ST_MakePoint (non gérée par Prisma).
   */
  async upsertWithPoint(
    input: UpsertSiteWithPointInput,
  ): Promise<{ id: string }> {
    const {
      osmId,
      latitude,
      longitude,
      commune,
      department,
      protectionStatus,
      ...rest
    } = input;

    const site = await this.prisma.heritageSite.upsert({
      where: { osmId },
      create: {
        osmId,
        commune: commune ?? null,
        department: department ?? null,
        protectionStatus: protectionStatus ?? ProtectionStatus.NONE,
        photos: [],
        ...rest,
      },
      update: {
        commune: commune ?? undefined,
        department: department ?? undefined,
        protectionStatus: protectionStatus ?? undefined,
        ...rest,
      },
      select: { id: true },
    });

    await this.prisma.$executeRaw`
      UPDATE "HeritageSite"
      SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      WHERE "id" = ${site.id};
    `;

    return site;
  }

  /**
   * Construit le fragment SQL des filtres optionnels (type, protection,
   * collecte en cours). Renvoie un fragment vide si aucun filtre.
   */
  private buildFilters(filters: SiteFiltersDto): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];

    if (filters.type && filters.type.length > 0) {
      conditions.push(
        Prisma.sql`s."type" = ANY(${filters.type}::"HeritageType"[])`,
      );
    }

    if (filters.protectionStatus && filters.protectionStatus.length > 0) {
      conditions.push(
        Prisma.sql`s."protectionStatus" = ANY(${filters.protectionStatus}::"ProtectionStatus"[])`,
      );
    }

    if (filters.onlyWithActiveCollection) {
      // Au moins un projet PUBLISHED dont la collecte n'est pas terminée.
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "Project" p
          WHERE p."heritageSiteId" = s."id"
            AND p."status" = 'PUBLISHED'
            AND p."collectedAmount" < p."targetAmount"
        )`,
      );
    }

    if (conditions.length === 0) return Prisma.empty;
    return Prisma.sql`AND ${Prisma.join(conditions, ' AND ')}`;
  }
}
