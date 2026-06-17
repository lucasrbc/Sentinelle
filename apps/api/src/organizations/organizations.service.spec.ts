import { ConflictException } from '@nestjs/common';
import { OrganizationType, UserRole, type User } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';

function donor(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'porteur@mairie.fr',
    name: null,
    role: UserRole.DONOR,
    authProviderId: 'sub-1',
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('OrganizationsService.createForUser', () => {
  it('crée une organisation non vérifiée et passe le créateur en PROJECT_OWNER', async () => {
    const orgCreate = jest
      .fn()
      .mockResolvedValue({ id: 'org1', verified: false });
    const userUpdate = jest.fn().mockResolvedValue({});
    const tx = {
      organization: { create: orgCreate },
      user: { update: userUpdate },
    };
    const prisma = {
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;

    const service = new OrganizationsService(prisma);
    const org = await service.createForUser(donor(), {
      name: 'Commune de Brest',
      type: OrganizationType.COMMUNE,
    });

    expect(orgCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: false }),
      }),
    );
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { organizationId: 'org1', role: UserRole.PROJECT_OWNER },
    });
    expect(org).toEqual({ id: 'org1', verified: false });
  });

  it('refuse si le compte est déjà rattaché à une organisation', async () => {
    const prisma = { $transaction: jest.fn() } as unknown as PrismaService;
    const service = new OrganizationsService(prisma);

    await expect(
      service.createForUser(donor({ organizationId: 'org-existante' }), {
        name: 'X',
        type: OrganizationType.ASSOCIATION,
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
