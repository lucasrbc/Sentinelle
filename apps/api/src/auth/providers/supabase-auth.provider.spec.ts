import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { SupabaseAuthProvider } from './supabase-auth.provider';

/**
 * Couvre le chemin HS256 (secret partagé), vérifiable sans réseau. Le chemin
 * asymétrique (JWKS) est validé en conditions réelles avec un vrai projet.
 */
describe('SupabaseAuthProvider (HS256)', () => {
  const secret = 'supabase-jwt-secret';
  const config = {
    get: (key: string) =>
      key === 'SUPABASE_JWT_SECRET' ? secret : undefined,
  } as unknown as ConfigService;
  const provider = new SupabaseAuthProvider(config);

  it('vérifie un jeton Supabase HS256 et extrait sub + email', async () => {
    const token = jwt.sign(
      { sub: 'uuid-supabase', email: 'membre@exemple.fr', aud: 'authenticated' },
      secret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    await expect(provider.verifyToken(token)).resolves.toEqual({
      providerId: 'uuid-supabase',
      email: 'membre@exemple.fr',
    });
  });

  it('rejette un jeton signé avec un mauvais secret', async () => {
    const token = jwt.sign({ sub: 'x' }, 'autre-secret', {
      algorithm: 'HS256',
    });
    await expect(provider.verifyToken(token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('échoue à la construction si aucune configuration n’est fournie', () => {
    const empty = { get: () => undefined } as unknown as ConfigService;
    expect(() => new SupabaseAuthProvider(empty)).toThrow();
  });
});
