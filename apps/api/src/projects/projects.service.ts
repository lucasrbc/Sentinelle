import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProjectStatus,
  UserRole,
  type Project,
  type ProjectUpdate,
  type User,
} from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { CreateProjectUpdateDto } from './dto/create-project-update.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'projet'}-${suffix}`;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crée un projet en brouillon pour l'organisation du porteur. */
  async create(user: User, dto: CreateProjectDto): Promise<Project> {
    if (!user.organizationId) {
      throw new ForbiddenException(
        'Créez d’abord votre organisation pour porter un projet.',
      );
    }
    const site = await this.prisma.heritageSite.findUnique({
      where: { id: dto.heritageSiteId },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException('Lieu de patrimoine introuvable.');
    }

    return this.prisma.project.create({
      data: {
        slug: slugify(dto.title),
        title: dto.title,
        summary: dto.summary,
        description: dto.description,
        urgencyLevel: dto.urgencyLevel,
        targetAmount: dto.targetAmount,
        status: ProjectStatus.DRAFT,
        heritageSiteId: dto.heritageSiteId,
        organizationId: user.organizationId,
      },
    });
  }

  /** Met à jour un projet (porteur de l'organisation, hors statut publié). */
  async update(
    user: User,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.requireOwnedProject(user, id);
    if (
      project.status !== ProjectStatus.DRAFT &&
      project.status !== ProjectStatus.PENDING_REVIEW
    ) {
      throw new BadRequestException(
        'Seuls les projets en brouillon ou en cours de validation sont modifiables.',
      );
    }
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  /** Soumet un brouillon à la modération. */
  async submit(user: User, id: string): Promise<Project> {
    const project = await this.requireOwnedProject(user, id);
    if (project.status !== ProjectStatus.DRAFT) {
      throw new BadRequestException(
        'Seul un brouillon peut être soumis à validation.',
      );
    }
    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.PENDING_REVIEW },
    });
  }

  /** Enregistre l'URL du devis téléversé. */
  async setQuoteUrl(user: User, id: string, quoteUrl: string): Promise<Project> {
    await this.requireOwnedProject(user, id);
    return this.prisma.project.update({ where: { id }, data: { quoteUrl } });
  }

  /** Liste les projets de l'organisation du porteur (tous statuts). */
  async listMine(user: User): Promise<Project[]> {
    if (!user.organizationId) return [];
    return this.prisma.project.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Détail d'un projet pour son porteur (ou un admin). */
  async getOne(user: User, id: string): Promise<Project> {
    return this.requireOwnedProject(user, id);
  }

  /** Ajoute une actualité de chantier. */
  async addUpdate(
    user: User,
    projectId: string,
    dto: CreateProjectUpdateDto,
  ): Promise<ProjectUpdate> {
    await this.requireOwnedProject(user, projectId);
    return this.prisma.projectUpdate.create({
      data: {
        projectId,
        title: dto.title,
        body: dto.body,
        imageUrls: dto.imageUrls ?? [],
      },
    });
  }

  /** Liste les actualités : public si le projet est publié, sinon porteur/admin. */
  async listUpdates(
    projectId: string,
    user?: User,
  ): Promise<ProjectUpdate[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, organizationId: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');

    const isPublic = project.status === ProjectStatus.PUBLISHED;
    const isOwnerOrAdmin =
      user &&
      (user.role === UserRole.ADMIN ||
        user.organizationId === project.organizationId);
    if (!isPublic && !isOwnerOrAdmin) {
      throw new ForbiddenException('Projet non public.');
    }

    return this.prisma.projectUpdate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Modération (ADMIN) ────────────────────────────────────────────────────

  /** File de modération : projets en attente de validation. */
  async listForModeration(): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { status: ProjectStatus.PENDING_REVIEW },
      orderBy: { updatedAt: 'asc' },
    });
  }

  /** Publie un projet (admin) — uniquement si l'organisation est vérifiée. */
  async publish(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { organization: { select: { verified: true } } },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');
    if (!project.organization.verified) {
      throw new BadRequestException(
        'L’organisation porteuse doit être vérifiée avant publication.',
      );
    }
    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  /** Renvoie un projet en brouillon (admin). */
  async reject(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projet introuvable.');
    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.DRAFT, publishedAt: null },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Charge un projet et vérifie que l'utilisateur en est porteur (ou admin). */
  private async requireOwnedProject(user: User, id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projet introuvable.');
    if (
      user.role !== UserRole.ADMIN &&
      project.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException(
        'Ce projet appartient à une autre organisation.',
      );
    }
    return project;
  }
}
