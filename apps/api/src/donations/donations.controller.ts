import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@sentinelle/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';

@Controller('donations')
export class DonationsController {
  constructor(
    private readonly donations: DonationsService,
    private readonly config: ConfigService,
  ) {}

  /** Démarre un don (ponctuel ou mensuel) ; renvoie l'URL de paiement. Public. */
  @Public()
  @Post('checkout')
  checkout(
    @Body() dto: CreateDonationDto,
  ): Promise<{ donationId: string; checkoutUrl: string }> {
    return this.donations.createCheckout(dto);
  }

  /** Dons du donateur connecté (identifié par email). */
  @Get('mine')
  listMine(@CurrentUser() user: User) {
    return this.donations.listMine(user.email);
  }

  /** Lien du reçu fiscal d'un don (id non devinable). Public. */
  @Public()
  @Get(':id/receipt')
  receipt(@Param('id') id: string): Promise<{ pdfUrl: string | null }> {
    return this.donations.getReceiptUrl(id);
  }

  /** Simulation de paiement réussi — uniquement en mode PSP « dev ». */
  @Public()
  @Post(':id/dev-complete')
  async devComplete(@Param('id') id: string): Promise<{ status: string }> {
    const provider = (
      this.config.get<string>('PAYMENT_PROVIDER') ?? 'stripe'
    ).toLowerCase();
    if (provider !== 'dev') {
      throw new ForbiddenException('Disponible uniquement en mode PSP dev.');
    }
    const donation = await this.donations.markSucceededById(id);
    return { status: donation.status };
  }
}
