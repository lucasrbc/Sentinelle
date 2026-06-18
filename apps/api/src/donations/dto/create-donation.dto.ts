import { IsEmail, IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
import { DonationType } from '@sentinelle/db';

export class CreateDonationDto {
  @IsString()
  projectId!: string;

  // Montant en CENTIMES (1 € à 1 000 000 €).
  @IsInt()
  @Min(100)
  @Max(100000000)
  amount!: number;

  @IsEnum(DonationType)
  type!: DonationType;

  @IsEmail()
  donorEmail!: string;
}
