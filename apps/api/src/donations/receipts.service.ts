import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Donation, FiscalReceipt } from '@sentinelle/db';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.types';

function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /**
   * Génère (une seule fois) le reçu fiscal PDF d'un don et l'enregistre.
   * Mentions paramétrables par variables d'environnement (validation juridique
   * finale externe — SPEC §8).
   */
  async ensureForDonation(donation: Donation): Promise<FiscalReceipt> {
    const existing = await this.prisma.fiscalReceipt.findUnique({
      where: { donationId: donation.id },
    });
    if (existing) return existing;

    const number = `SENT-${new Date().getFullYear()}-${donation.id
      .slice(-10)
      .toUpperCase()}`;
    const pdf = await this.buildPdf(donation, number);
    const stored = await this.storage.save(
      `receipts/${number}.pdf`,
      pdf,
      'application/pdf',
    );

    return this.prisma.fiscalReceipt.create({
      data: {
        donationId: donation.id,
        receiptNumber: number,
        amount: donation.amount,
        pdfUrl: stored.url,
      },
    });
  }

  private buildPdf(donation: Donation, number: string): Promise<Buffer> {
    const orgName =
      this.config.get<string>('RECEIPT_ORG_NAME') ?? 'Sentinelle';
    const legal =
      this.config.get<string>('RECEIPT_LEGAL_MENTION') ??
      'Reçu émis sous réserve de validation juridique finale.';

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(20).text('Reçu de don', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Organisme : ${orgName}`);
    doc.text(`Numéro de reçu : ${number}`);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`);
    doc.text(`Donateur : ${donation.donorEmail ?? '—'}`);
    doc.text(`Montant : ${formatEuros(donation.amount)}`);
    doc.text(
      `Type : ${donation.type === 'MONTHLY' ? 'Don mensuel' : 'Don ponctuel'}`,
    );
    doc.moveDown();
    doc.fontSize(10).text(legal, { align: 'left' });

    doc.end();
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
