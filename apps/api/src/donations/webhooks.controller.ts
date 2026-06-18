import {
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment.types';
import { DonationsService } from './donations.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly donations: DonationsService,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
  ) {}

  /** Webhook PSP (Stripe) — corps brut requis pour la vérification de signature. */
  @Public()
  @Post('stripe')
  @HttpCode(200)
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    const payload = req.rawBody ?? Buffer.from('');
    const event = await this.payment.parseWebhook(payload, signature);
    if (event?.succeeded) {
      await this.donations.handleSucceededByReference(event.reference);
    }
    return { received: true };
  }
}
