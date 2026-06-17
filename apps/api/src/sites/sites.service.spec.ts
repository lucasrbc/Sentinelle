import { Test } from '@nestjs/testing';
import { ProtectionStatus } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from './sites.service';

/**
 * Tests unitaires de la logique géo : on vérifie que les requêtes spatiales
 * sont déléguées à PostGIS (SQL brut) et non filtrées côté client, et que
 * l'upsert écrit la géométrie séparément.
 */
describe('SitesService', () => {
  let service: SitesService;
  let queryRaw: jest.Mock;
  let executeRaw: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([]);
    executeRaw = jest.fn().mockResolvedValue(1);
    upsert = jest.fn().mockResolvedValue({ id: 'site_1' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SitesService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: queryRaw,
            $executeRaw: executeRaw,
            heritageSite: { upsert },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SitesService);
  });

  it('searchAround délègue à PostGIS via une requête SQL brute', async () => {
    await service.searchAround({ lat: 48.39, lng: -4.49, radius: 5000 });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('searchInBbox délègue à PostGIS via une requête SQL brute', async () => {
    await service.searchInBbox({
      minLng: -4.6,
      minLat: 48.3,
      maxLng: -4.3,
      maxLat: 48.5,
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('upsertWithPoint écrit la géométrie en SQL brut après l’upsert Prisma', async () => {
    const result = await service.upsertWithPoint({
      osmId: 'node/1',
      slug: 'chapelle-test-node-1',
      name: 'Chapelle Test',
      type: 'CHAPEL',
      latitude: 48.39,
      longitude: -4.49,
      protectionStatus: ProtectionStatus.NONE,
    });

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'site_1' });
  });
});
