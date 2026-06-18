import { Test } from '@nestjs/testing';
import { ProtectionStatus } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from './sites.service';

/**
 * Tests unitaires de la logique géo : on vérifie que les requêtes spatiales
 * sont déléguées à PostGIS (SQL brut) et non filtrées côté client, que
 * l'upsert écrit la géométrie séparément, et que le détail d'un lieu agrège
 * son projet publié.
 */
describe('SitesService', () => {
  let service: SitesService;
  let queryRaw: jest.Mock;
  let executeRaw: jest.Mock;
  let upsert: jest.Mock;
  let findUnique: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([]);
    executeRaw = jest.fn().mockResolvedValue(1);
    upsert = jest.fn().mockResolvedValue({ id: 'site_1' });
    findUnique = jest.fn().mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SitesService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: queryRaw,
            $executeRaw: executeRaw,
            heritageSite: { upsert, findUnique },
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

  it('searchByText délègue la recherche nom/commune à PostGIS', async () => {
    await service.searchByText({ q: 'brest' });
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

  it('getBySlug renvoie null pour un lieu inexistant', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.getBySlug('inconnu')).resolves.toBeNull();
  });

  it('getBySlug agrège le projet publié et les coordonnées', async () => {
    findUnique.mockResolvedValue({
      id: 'site_1',
      slug: 'cathedrale-brest',
      name: 'Cathédrale',
      type: 'CHURCH',
      description: null,
      commune: 'Brest',
      department: '29',
      protectionStatus: ProtectionStatus.CLASSE,
      conservationState: null,
      photos: [],
      projects: [
        {
          id: 'p1',
          slug: 'toiture',
          title: 'Réfection toiture',
          summary: null,
          urgencyLevel: 'HIGH',
          targetAmount: 5000000,
          collectedAmount: 1250000,
          quoteUrl: null,
        },
      ],
    });
    queryRaw.mockResolvedValue([{ latitude: 48.39, longitude: -4.49 }]);

    const detail = await service.getBySlug('cathedrale-brest');

    expect(detail?.latitude).toBe(48.39);
    expect(detail?.project?.targetAmount).toBe(5000000);
    expect(detail?.project?.collectedAmount).toBe(1250000);
  });
});
