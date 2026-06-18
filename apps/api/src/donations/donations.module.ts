import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevPaymentProvider } from '../payments/dev-payment.provider';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment.types';
import { StripePaymentProvider } from '../payments/stripe-payment.provider';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { ReceiptsService } from './receipts.service';
import { TransparencyController } from './transparency.controller';
import { WebhooksController } from './webhooks.controller';

/** Choisit le PSP selon PAYMENT_PROVIDER (`stripe` par défaut, `dev` en local). */
const paymentFactory = {
  provide: PAYMENT_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): PaymentProvider => {
    const kind = (config.get<string>('PAYMENT_PROVIDER') ?? 'stripe').toLowerCase();
    return kind === 'dev'
      ? new DevPaymentProvider()
      : new StripePaymentProvider(config);
  },
};

@Module({
  controllers: [DonationsController, WebhooksController, TransparencyController],
  providers: [DonationsService, ReceiptsService, paymentFactory],
  exports: [DonationsService],
})
export class DonationsModule {}
