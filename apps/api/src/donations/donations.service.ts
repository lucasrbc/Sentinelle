import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DonationStatus,
  ProjectStatus,
  type Donation,
  type FiscalReceipt,
} from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment.types';
import type { CreateDonationDto } from './dto/create-donation.dto';
import { ReceiptsService } from './receipts.service';

export interface TransparencyView {
  projectTitle: string;
  targetAmount: number;
  collectedAmount: number;
  donationsCount: number;
  monthlyCount: number;
}

@Injectable()
export class DonationsService {
  private readonly logger = new Logger('Payments');
  private readonly webOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly receipts: ReceiptsService,
    config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
  ) {
    this.webOrigin = (config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000')
      .split(',')[0]
      .trim();
  }

  /**
   * Crée un don (PENDING) et ouvre une session de paiement. Refuse tout don sur
   * un projet non publié (« aucun don sans projet/porteur identifié »).
   */
  async createCheckout(
    dto: CreateDonationDto,
  ): Promise<{ donationId: string; checkoutUrl: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: { heritageSite: { select: { slug: true } } },
    });
    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException(
        'Don impossible : projet introuvable ou non publié.',
      );
    }

    const donation = await this.prisma.donation.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        currency: 'eur',
        status: DonationStatus.PENDING,
        projectId: project.id,
        donorEmail: dto.donorEmail.toLowerCase(),
      },
    });

    const checkout = await this.payment.createCheckout({
      donationId: donation.id,
      projectTitle: project.title,
      amount: dto.amount,
      type: dto.type,
      donorEmail: dto.donorEmail,
      successUrl: `${this.webOrigin}/don/merci?donation=${donation.id}`,
      cancelUrl: `${this.webOrigin}/lieux/${project.heritageSite.slug}`,
    });

    if (checkout.reference) {
      await this.prisma.donation.update({
        where: { id: donation.id },
        data: { stripePaymentIntentId: checkout.reference },
      });
    }

    this.logger.log(
      `Don ${donation.id} créé (PENDING, ${dto.amount} c, ${dto.type})`,
    );
    return { donationId: donation.id, checkoutUrl: checkout.url };
  }

  /** Marque un don payé à partir de sa référence PSP (webhook). */
  async handleSucceededByReference(reference: string): Promise<void> {
    const donation = await this.prisma.donation.findUnique({
      where: { stripePaymentIntentId: reference },
    });
    if (!donation) return;
    await this.markSucceeded(donation);
  }

  /** Marque un don payé à partir de son id (mode dev). */
  async markSucceededById(id: string): Promise<Donation> {
    const donation = await this.prisma.donation.findUnique({ where: { id } });
    if (!donation) throw new NotFoundException('Don introuvable.');
    return this.markSucceeded(donation);
  }

  private async markSucceeded(donation: Donation): Promise<Donation> {
    const updated =
      donation.status === DonationStatus.SUCCEEDED
        ? donation
        : await this.prisma.donation.update({
            where: { id: donation.id },
            data: { status: DonationStatus.SUCCEEDED },
          });

    // Recalcule la jauge : source de vérité = somme des dons SUCCEEDED.
    await this.recomputeCollected(donation.projectId);
    // Génère le reçu fiscal (idempotent).
    await this.receipts.ensureForDonation(updated);

    this.logger.log(`Don ${donation.id} confirmé SUCCEEDED, jauge recalculée.`);
    return updated;
  }

  private async recomputeCollected(projectId: string): Promise<void> {
    const agg = await this.prisma.donation.aggregate({
      where: { projectId, status: DonationStatus.SUCCEEDED },
      _sum: { amount: true },
    });
    await this.prisma.project.update({
      where: { id: projectId },
      data: { collectedAmount: agg._sum.amount ?? 0 },
    });
  }

  /** Dons effectués avec l'email du donateur connecté (avec reçus). */
  async listMine(email: string): Promise<(Donation & { receipt: FiscalReceipt | null })[]> {
    return this.prisma.donation.findMany({
      where: { donorEmail: email.toLowerCase() },
      include: { receipt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReceiptUrl(donationId: string): Promise<{ pdfUrl: string | null }> {
    const receipt = await this.prisma.fiscalReceipt.findUnique({
      where: { donationId },
    });
    if (!receipt) throw new NotFoundException('Reçu non disponible.');
    return { pdfUrl: receipt.pdfUrl };
  }

  /** Données de transparence publiques d'un projet publié. */
  async transparency(projectId: string): Promise<TransparencyView> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true, status: true, targetAmount: true, collectedAmount: true },
    });
    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      throw new NotFoundException('Projet introuvable ou non publié.');
    }
    const agg = await this.prisma.donation.aggregate({
      where: { projectId, status: DonationStatus.SUCCEEDED },
      _count: true,
    });
    const monthlyCount = await this.prisma.donation.count({
      where: { projectId, status: DonationStatus.SUCCEEDED, type: 'MONTHLY' },
    });

    return {
      projectTitle: project.title,
      targetAmount: project.targetAmount,
      collectedAmount: project.collectedAmount,
      donationsCount: agg._count,
      monthlyCount,
    };
  }
}
