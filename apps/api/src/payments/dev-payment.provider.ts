import { Injectable } from '@nestjs/common';
import type {
  CheckoutParams,
  CheckoutResult,
  NormalizedPaymentEvent,
  PaymentProvider,
} from './payment.types';

/**
 * PSP de développement/test : ne contacte aucun service externe. Le « paiement »
 * est simulé via l'endpoint POST /donations/:id/dev-complete. Permet de tester
 * tout le parcours de don (don → succès → recalcul jauge → reçu) sans Stripe.
 * À n'utiliser qu'en local / CI.
 */
@Injectable()
export class DevPaymentProvider implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    // On redirige directement vers la page de remerciement (succès simulé côté UI/test).
    return { url: params.successUrl, reference: `dev_${params.donationId}` };
  }

  async parseWebhook(): Promise<NormalizedPaymentEvent | null> {
    // Pas de webhook en mode dev (succès déclenché manuellement).
    return null;
  }
}
