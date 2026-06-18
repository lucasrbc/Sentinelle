import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrganizationType } from '@sentinelle/db';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsEnum(OrganizationType)
  type!: OrganizationType;

  // SIRET français : 14 chiffres (optionnel à la création).
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'Le SIRET doit comporter 14 chiffres' })
  siret?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
