import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, type Organization, type User } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une organisation et fait de son créateur un PROJECT_OWNER rattaché.
   * L'organisation démarre NON vérifiée : un administrateur devra la valider
   * (exigence de confiance — un porteur doit être identifié). Opération
   * transactionnelle (organisation + utilisateur cohérents, ou rien).
   */
  async createForUser(
    user: User,
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    if (user.organizationId) {
      throw new ConflictException(
        'Ce compte est déjà rattaché à une organisation',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          type: dto.type,
          siret: dto.siret,
          contactEmail: dto.contactEmail,
          description: dto.description,
          verified: false,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          organizationId: organization.id,
          // Un donateur devient porteur ; un admin conserve son rôle.
          role: user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.PROJECT_OWNER,
        },
      });

      return organization;
    });
  }

  async getById(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }
    return organization;
  }

  /** Administration : lister les organisations (option : seulement non vérifiées). */
  async list(onlyUnverified = false): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: onlyUnverified ? { verified: false } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Administration : valider une organisation (confiance). */
  async setVerified(id: string, verified: boolean): Promise<Organization> {
    await this.getById(id);
    return this.prisma.organization.update({
      where: { id },
      data: { verified },
    });
  }
}
