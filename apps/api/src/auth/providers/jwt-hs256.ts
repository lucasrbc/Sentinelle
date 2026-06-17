import { UnauthorizedException } from '@nestjs/common';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { AuthIdentity } from '../auth.types';

/**
 * Vérifie un JWT signé en HS256 avec un secret partagé (mécanisme par défaut
 * de Supabase Auth) et en extrait l'identité. Toute erreur de vérification est
 * convertie en 401.
 */
export function verifyHs256Token(token: string, secret: string): AuthIdentity {
  let payload: JwtPayload;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') {
      throw new Error('Charge utile du jeton invalide');
    }
    payload = decoded;
  } catch {
    throw new UnauthorizedException('Jeton invalide ou expiré');
  }

  const sub = payload.sub;
  if (!sub || typeof sub !== 'string') {
    throw new UnauthorizedException('Jeton sans identifiant utilisateur');
  }

  const email =
    typeof payload.email === 'string' ? payload.email : null;

  return { providerId: sub, email };
}
