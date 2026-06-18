import type { DonationType } from '@sentinelle/db';

/** Jeton d'injection du PSP (couche d'abstraction paiements). */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CheckoutParams {
  donationId: string;
  projectTitle: string;
  amount: number; // centimes
  type: DonationType;
  donorEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  /** URL vers laquelle rediriger le donateur pour payer. */
  url: string;
  /** Référence du paiement chez le PSP (id de session), stockée sur le don. */
  reference: string | null;
}

/** Événement de paiement normalisé issu d'un webhook. */
export interface NormalizedPaymentEvent {
  succeeded: boolean;
  reference: string;
}

/**
 * Abstraction PSP : permet d'utiliser Stripe aujourd'hui et de brancher plus
 * tard une solution de cantonnement des fonds tiers (Lemonway / MangoPay) sans
 * toucher au reste du code. Les fonds appartiennent au projet, pas à la
 * plateforme (cf. SPEC §8).
 */
export interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  /** Vérifie et normalise un webhook ; renvoie null si non pertinent/invalide. */
  parseWebhook(
    payload: Buffer,
    signature: string | undefined,
  ): Promise<NormalizedPaymentEvent | null>;
}
