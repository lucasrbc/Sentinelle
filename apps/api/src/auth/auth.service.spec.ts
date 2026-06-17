import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserRole } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService.findOrCreateUser', () => {
  let upsert: jest.Mock;
  let update: jest.Mock;

  async function buildService(adminEmails = ''): Promise<AuthService> {
    upsert = jest.fn();
    update = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: { upsert, update } } },
        { provide: ConfigService, useValue: { get: () => adminEmails } },
      ],
    }).compile();
    return moduleRef.get(AuthService);
  }

  it('crée un compte DONOR par défaut à la première connexion', async () => {
    const service = await buildService();
    upsert.mockResolvedValue({ id: 'u1', role: UserRole.DONOR });

    await service.findOrCreateUser({ providerId: 'sub-1', email: 'a@b.fr' });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authProviderId: 'sub-1' },
        create: expect.objectContaining({
          authProviderId: 'sub-1',
          email: 'a@b.fr',
          role: UserRole.DONOR,
        }),
      }),
    );
  });

  it('crée directement un ADMIN si l’email est dans ADMIN_EMAILS', async () => {
    const service = await buildService('boss@sentinelle.fr');
    upsert.mockResolvedValue({ id: 'u2', role: UserRole.ADMIN });

    await service.findOrCreateUser({
      providerId: 'sub-2',
      email: 'BOSS@sentinelle.fr', // casse différente → doit matcher
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: UserRole.ADMIN }),
      }),
    );
  });

  it('promeut en ADMIN un compte existant listé mais encore DONOR', async () => {
    const service = await buildService('boss@sentinelle.fr');
    upsert.mockResolvedValue({ id: 'u3', role: UserRole.DONOR });
    update.mockResolvedValue({ id: 'u3', role: UserRole.ADMIN });

    const result = await service.findOrCreateUser({
      providerId: 'sub-3',
      email: 'boss@sentinelle.fr',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'u3' },
      data: { role: UserRole.ADMIN },
    });
    expect(result.role).toBe(UserRole.ADMIN);
  });
});
