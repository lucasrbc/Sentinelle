import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UrgencyLevel } from '@sentinelle/db';

export class CreateProjectDto {
  @IsString()
  heritageSiteId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgencyLevel?: UrgencyLevel;

  // Montant nécessaire en CENTIMES (≥ 1 €).
  @IsInt()
  @Min(100)
  targetAmount!: number;
}
