import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HeritageType, ProtectionStatus, UrgencyLevel } from '@sentinelle/db';

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

  // Filtre par niveau d'urgence du projet PUBLISHED rattaché au site.
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(UrgencyLevel, { each: true })
  urgency?: UrgencyLevel[];

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

/** Recherche texte par nom de lieu / commune (barre de recherche). */
export class SearchTextDto extends SiteFiltersDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q!: string;
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
