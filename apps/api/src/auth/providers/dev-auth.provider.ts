import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthIdentity, AuthProvider } from '../auth.types';
import { verifyHs256Token } from './jwt-hs256';

/**
 * Fournisseur d'auth de développement/test : vérifie un JWT HS256 signé avec
 * `DEV_AUTH_SECRET`. Il permet de tester de bout en bout le parcours
 * authentifié (gardes, rôles, création de compte) SANS dépendre d'un compte
 * Supabase réel. À n'utiliser qu'en local / CI (jamais en production).
 */
@Injectable()
export class DevAuthProvider implements AuthProvider {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('DEV_AUTH_SECRET') ?? 'dev-secret';
  }

  async verifyToken(token: string): Promise<AuthIdentity> {
    return verifyHs256Token(token, this.secret);
  }
}
