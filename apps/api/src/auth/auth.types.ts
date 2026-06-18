import type { Request } from 'express';
import type { User } from '@sentinelle/db';

/** Identité brute extraite d'un jeton vérifié, avant rapprochement en base. */
export interface AuthIdentity {
  /** Identifiant de l'utilisateur chez le fournisseur d'auth (Supabase `sub`). */
  providerId: string;
  /** Email porté par le jeton (peut être absent selon le fournisseur). */
  email: string | null;
}

/** Requête Express enrichie de l'utilisateur Sentinelle authentifié. */
export interface AuthenticatedRequest extends Request {
  user?: User;
}

/** Jeton d'injection du fournisseur d'auth (couche d'abstraction). */
export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');

/**
 * Couche d'abstraction « fournisseur d'authentification » : permet de brancher
 * Supabase Auth aujourd'hui et d'en changer plus tard sans toucher au reste du
 * code (même esprit que l'abstraction PSP prévue pour les paiements).
 */
export interface AuthProvider {
  /** Vérifie un jeton d'accès et renvoie l'identité, ou lève une exception. */
  verifyToken(token: string): Promise<AuthIdentity>;
}
