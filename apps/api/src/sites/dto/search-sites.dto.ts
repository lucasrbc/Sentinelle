import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { HeritageType, ProtectionStatus } from '@sentinelle/db';

/** Transforme `?type=CHURCH,CHAPEL` (ou répété) en tableau. */
function toArray(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return value;
}

/** Filtres communs aux recherches « autour de moi » et par bounding box. */
export class SiteFiltersDto {
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(HeritageType, { each: true })
  type?: HeritageType[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(ProtectionStatus, { each: true })
  protectionStatus?: ProtectionStatus[];

  // Ne renvoyer que les sites portant un projet PUBLISHED avec collecte en cours.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  onlyWithActiveCollection?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

/** Recherche « autour de moi » : point + rayon (mètres). */
export class SearchAroundDto extends SiteFiltersDto {
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  // Rayon en mètres (1 m → 50 km).
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  radius!: number;
}

/** Recherche par bounding box (emprise de la carte visible). */
export class SearchInBboxDto extends SiteFiltersDto {
  @Type(() => Number)
  @IsLongitude()
  minLng!: number;

  @Type(() => Number)
  @IsLatitude()
  minLat!: number;

  @Type(() => Number)
  @IsLongitude()
  maxLng!: number;

  @Type(() => Number)
  @IsLatitude()
  maxLat!: number;
}
