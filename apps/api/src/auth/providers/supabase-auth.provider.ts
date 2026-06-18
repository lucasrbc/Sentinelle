import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthIdentity, AuthProvider } from '../auth.types';
import { verifyHs256Token } from './jwt-hs256';

/**
 * Vérifie les jetons d'accès émis par Supabase Auth (JWT HS256 signé avec le
 * secret du projet `SUPABASE_JWT_SECRET`). Aucun mot de passe ni session n'est
 * stocké côté Sentinelle : Supabase reste la source de vérité des identifiants.
 */
@Injectable()
export class SupabaseAuthProvider implements AuthProvider {
  private readonly secret: string;

  constructor(config: ConfigService) {
    const secret = config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      throw new Error(
        'SUPABASE_JWT_SECRET est requis lorsque AUTH_PROVIDER=supabase.',
      );
    }
    this.secret = secret;
  }

  async verifyToken(token: string): Promise<AuthIdentity> {
    return verifyHs256Token(token, this.secret);
  }
}
