import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { DevAuthProvider } from './dev-auth.provider';

describe('DevAuthProvider', () => {
  const secret = 'test-secret';
  const config = { get: () => secret } as unknown as ConfigService;
  const provider = new DevAuthProvider(config);

  it('vérifie un jeton HS256 valide et en extrait l’identité', async () => {
    const token = jwt.sign(
      { sub: 'sub-42', email: 'donateur@exemple.fr', aud: 'authenticated' },
      secret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    await expect(provider.verifyToken(token)).resolves.toEqual({
      providerId: 'sub-42',
      email: 'donateur@exemple.fr',
    });
  });

  it('rejette un jeton signé avec un mauvais secret', async () => {
    const token = jwt.sign({ sub: 'sub-1' }, 'mauvais-secret', {
      algorithm: 'HS256',
    });
    await expect(provider.verifyToken(token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejette un jeton sans identifiant utilisateur (sub)', async () => {
    const token = jwt.sign({ email: 'x@y.fr' }, secret, { algorithm: 'HS256' });
    await expect(provider.verifyToken(token)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
