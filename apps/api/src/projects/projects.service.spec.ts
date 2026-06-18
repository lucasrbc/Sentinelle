import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectStatus, UserRole, type User } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

function owner(orgId: string | null = 'org-1'): User {
  return {
    id: 'u1',
    email: 'porteur@mairie.fr',
    name: null,
    role: UserRole.PROJECT_OWNER,
    authProviderId: 'sub',
    organizationId: orgId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}

describe('ProjectsService', () => {
  it('refuse la création sans organisation', async () => {
    const prisma = {} as PrismaService;
    const service = new ProjectsService(prisma);
    await expect(
      service.create(owner(null), {
        heritageSiteId: 's1',
        title: 'Toiture',
        targetAmount: 100000,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('crée un projet en brouillon pour l’organisation du porteur', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p1' });
    const prisma = {
      heritageSite: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }) },
      project: { create },
    } as unknown as PrismaService;
    const service = new ProjectsService(prisma);

    await service.create(owner(), {
      heritageSiteId: 's1',
      title: 'Réfection toiture',
      targetAmount: 5000000,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectStatus.DRAFT,
          organizationId: 'org-1',
          heritageSiteId: 's1',
        }),
      }),
    );
  });

  it('empêche un porteur de modifier le projet d’une autre organisation', async () => {
    const prisma = {
      project: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'p1', organizationId: 'autre-org', status: 'DRAFT' }),
      },
    } as unknown as PrismaService;
    const service = new ProjectsService(prisma);

    await expect(
      service.update(owner('org-1'), 'p1', { title: 'Pirate' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('publie un projet seulement si l’organisation est vérifiée', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });
    const prisma = {
      project: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'p1', organization: { verified: true } }),
        update,
      },
    } as unknown as PrismaService;
    const service = new ProjectsService(prisma);

    await service.publish('p1');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ProjectStatus.PUBLISHED }),
      }),
    );
  });

  it('refuse la publication si l’organisation n’est pas vérifiée', async () => {
    const prisma = {
      project: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'p1', organization: { verified: false } }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new ProjectsService(prisma);

    await expect(service.publish('p1')).rejects.toThrow(BadRequestException);
  });

  it('ne soumet à la modération qu’un brouillon', async () => {
    const prisma = {
      project: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'p1', organizationId: 'org-1', status: 'PUBLISHED' }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new ProjectsService(prisma);

    await expect(service.submit(owner('org-1'), 'p1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
