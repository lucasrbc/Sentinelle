import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DonationType, ProjectStatus, OrganizationType } from '@sentinelle/db';
import request from 'supertest';

/**
 * E2E du parcours de don (SPEC §9) en mode PSP « dev » : don → confirmation →
 * recalcul de la jauge → reçu fiscal. Nécessite une base PostgreSQL accessible
 * (DATABASE_URL) ; exécuté en CI avec le service PostGIS.
 */
describe('Parcours de don (e2e)', () => {
  let app: INestApplication;
  let prisma: import('../src/prisma/prisma.service').PrismaService;
  const ids: { site?: string; org?: string; project?: string } = {};

  beforeAll(async () => {
    process.env.AUTH_PROVIDER = 'dev';
    process.env.PAYMENT_PROVIDER = 'dev';
    process.env.STORAGE_PROVIDER = 'local';
    process.env.UPLOADS_DIR = join(tmpdir(), 'sentinelle-e2e-uploads');

    const { AppModule } = await import('../src/app.module');
    const { PrismaService } = await import('../src/prisma/prisma.service');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const site = await prisma.heritageSite.create({
      data: {
        slug: `e2e-site-${Date.now()}`,
        name: 'Chapelle E2E',
        type: 'CHAPEL',
        photos: [],
      },
    });
    const org = await prisma.organization.create({
      data: { name: 'Asso E2E', type: OrganizationType.ASSOCIATION, verified: true },
    });
    const project = await prisma.project.create({
      data: {
        slug: `e2e-project-${Date.now()}`,
        title: 'Projet E2E',
        status: ProjectStatus.PUBLISHED,
        targetAmount: 1000000,
        collectedAmount: 0,
        heritageSiteId: site.id,
        organizationId: org.id,
        publishedAt: new Date(),
      },
    });
    ids.site = site.id;
    ids.org = org.id;
    ids.project = project.id;
  });

  afterAll(async () => {
    if (ids.project) {
      await prisma.donation.deleteMany({ where: { projectId: ids.project } });
      await prisma.project.delete({ where: { id: ids.project } }).catch(() => undefined);
    }
    if (ids.org) await prisma.organization.delete({ where: { id: ids.org } }).catch(() => undefined);
    if (ids.site) await prisma.heritageSite.delete({ where: { id: ids.site } }).catch(() => undefined);
    await app.close();
  });

  it('don ponctuel → confirmation → jauge recalculée → reçu', async () => {
    const server = app.getHttpServer();

    const checkout = await request(server)
      .post('/donations/checkout')
      .send({
        projectId: ids.project,
        amount: 5000,
        type: DonationType.ONE_TIME,
        donorEmail: 'e2e@test.fr',
      })
      .expect(201);
    const donationId = checkout.body.donationId as string;
    expect(donationId).toBeTruthy();

    await request(server)
      .post(`/donations/${donationId}/dev-complete`)
      .expect(201)
      .expect((r) => expect(r.body.status).toBe('SUCCEEDED'));

    await request(server)
      .get(`/transparency/${ids.project}`)
      .expect(200)
      .expect((r) => {
        expect(r.body.collectedAmount).toBe(5000);
        expect(r.body.donationsCount).toBe(1);
      });

    await request(server)
      .get(`/donations/${donationId}/receipt`)
      .expect(200)
      .expect((r) => expect(r.body.pdfUrl).toBeTruthy());
  });

  it('refuse un don sur un projet non publié', async () => {
    await request(app.getHttpServer())
      .post('/donations/checkout')
      .send({
        projectId: 'inexistant',
        amount: 5000,
        type: DonationType.ONE_TIME,
        donorEmail: 'e2e@test.fr',
      })
      .expect(400);
  });
});
