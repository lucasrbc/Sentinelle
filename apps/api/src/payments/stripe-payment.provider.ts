import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationType } from '@sentinelle/db';
import Stripe from 'stripe';
import type {
  CheckoutParams,
  CheckoutResult,
  NormalizedPaymentEvent,
  PaymentProvider,
} from './payment.types';

/** PSP Stripe (Checkout) — don ponctuel (payment) ou mensuel (subscription). */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY est requis pour PAYMENT_PROVIDER=stripe.');
    }
    this.stripe = new Stripe(key);
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const recurring =
      params.type === DonationType.MONTHLY
        ? ({ interval: 'month' } as const)
        : undefined;

    const session = await this.stripe.checkout.sessions.create({
      mode: params.type === DonationType.MONTHLY ? 'subscription' : 'payment',
      customer_email: params.donorEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: params.amount,
            recurring,
            product_data: { name: `Don — ${params.projectTitle}` },
          },
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { donationId: params.donationId },
    });

    return { url: session.url ?? params.successUrl, reference: session.id };
  }

  async parseWebhook(
    payload: Buffer,
    signature: string | undefined,
  ): Promise<NormalizedPaymentEvent | null> {
    if (!signature || !this.webhookSecret) return null;
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch {
      return null;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return { succeeded: true, reference: session.id };
    }
    return null;
  }
}
