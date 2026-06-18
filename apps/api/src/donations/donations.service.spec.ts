import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationStatus, DonationType } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import type { PaymentProvider } from '../payments/payment.types';
import { DonationsService } from './donations.service';
import type { ReceiptsService } from './receipts.service';

function build(overrides: {
  prisma?: Partial<Record<string, unknown>>;
} = {}) {
  const payment: PaymentProvider = {
    createCheckout: jest
      .fn()
      .mockResolvedValue({ url: 'https://pay/x', reference: 'ref_1' }),
    parseWebhook: jest.fn(),
  };
  const receipts = { ensureForDonation: jest.fn().mockResolvedValue({}) } as unknown as ReceiptsService;
  const config = { get: () => 'http://localhost:3000' } as unknown as ConfigService;
  const prisma = overrides.prisma as unknown as PrismaService;
  return {
    service: new DonationsService(prisma, receipts, config, payment),
    payment,
    receipts,
  };
}

describe('DonationsService', () => {
  it('refuse un don sur un projet non publié', async () => {
    const { service } = build({
      prisma: {
        project: { findUnique: jest.fn().mockResolvedValue({ status: 'DRAFT' }) },
      },
    });
    await expect(
      service.createCheckout({
        projectId: 'p1',
        amount: 5000,
        type: DonationType.ONE_TIME,
        donorEmail: 'd@x.fr',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('crée un don PENDING et renvoie l’URL de paiement', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'don1' });
    const update = jest.fn().mockResolvedValue({});
    const { service, payment } = build({
      prisma: {
        project: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1',
            title: 'Toiture',
            status: 'PUBLISHED',
            heritageSite: { slug: 'chapelle-x' },
          }),
        },
        donation: { create, update },
      },
    });

    const res = await service.createCheckout({
      projectId: 'p1',
      amount: 5000,
      type: DonationType.ONE_TIME,
      donorEmail: 'D@X.fr',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DonationStatus.PENDING,
          donorEmail: 'd@x.fr',
        }),
      }),
    );
    expect(payment.createCheckout).toHaveBeenCalled();
    expect(res).toEqual({ donationId: 'don1', checkoutUrl: 'https://pay/x' });
  });

  it('confirme un don, recalcule la jauge et génère le reçu', async () => {
    const donationUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'don1', projectId: 'p1', status: 'SUCCEEDED' });
    const projectUpdate = jest.fn().mockResolvedValue({});
    const aggregate = jest.fn().mockResolvedValue({ _sum: { amount: 5000 } });
    const { service, receipts } = build({
      prisma: {
        donation: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'don1', projectId: 'p1', status: 'PENDING' }),
          update: donationUpdate,
          aggregate,
        },
        project: { update: projectUpdate },
      },
    });

    await service.handleSucceededByReference('ref_1');

    expect(donationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: DonationStatus.SUCCEEDED } }),
    );
    expect(projectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { collectedAmount: 5000 } }),
    );
    expect(receipts.ensureForDonation).toHaveBeenCalled();
  });
});
