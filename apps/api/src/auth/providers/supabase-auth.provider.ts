import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import type { AuthIdentity, AuthProvider } from '../auth.types';

/**
 * Vérifie les jetons d'accès émis par Supabase Auth. Supporte les DEUX modes
 * de signature de Supabase :
 *   - HS256 (secret partagé `SUPABASE_JWT_SECRET`, projets « legacy ») ;
 *   - clés asymétriques (ES256/RS256) vérifiées via le JWKS public du projet
 *     `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (nouveau défaut Supabase).
 *
 * Aucun mot de passe ni session n'est stocké côté Sentinelle : Supabase reste
 * la source de vérité des identifiants.
 */
@Injectable()
export class SupabaseAuthProvider implements AuthProvider {
  private readonly hsSecret?: Uint8Array;
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: ConfigService) {
    const secret = config.get<string>('SUPABASE_JWT_SECRET');
    if (secret) {
      this.hsSecret = new TextEncoder().encode(secret);
    }

    const url =
      config.get<string>('SUPABASE_URL') ??
      config.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    if (url) {
      const base = url.replace(/\/$/, '');
      this.jwks = createRemoteJWKSet(
        new URL(`${base}/auth/v1/.well-known/jwks.json`),
      );
    }

    if (!this.hsSecret && !this.jwks) {
      throw new Error(
        'AUTH_PROVIDER=supabase requiert SUPABASE_JWT_SECRET (HS256) ou ' +
          'SUPABASE_URL (clés asymétriques via JWKS).',
      );
    }
  }

  async verifyToken(token: string): Promise<AuthIdentity> {
    let payload: JWTPayload;
    try {
      const { alg } = decodeProtectedHeader(token);
      if (alg === 'HS256') {
        if (!this.hsSecret) {
          throw new Error('SUPABASE_JWT_SECRET non configuré');
        }
        ({ payload } = await jwtVerify(token, this.hsSecret));
      } else {
        if (!this.jwks) {
          throw new Error('SUPABASE_URL non configuré (JWKS indisponible)');
        }
        ({ payload } = await jwtVerify(token, this.jwks));
      }
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }

    const sub = payload.sub;
    if (!sub) {
      throw new UnauthorizedException('Jeton sans identifiant utilisateur');
    }
    const email = typeof payload.email === 'string' ? payload.email : null;
    return { providerId: sub, email };
  }
}
