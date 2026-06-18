import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type User } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';

/** Vue publique d'un compte (jamais d'identifiant de fournisseur exposé). */
export interface UserView {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string | null;
}

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateName(userId: string, name: string | undefined): Promise<UserView> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return toUserView(user);
  }

  async list(): Promise<UserView[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toUserView);
  }

  async updateRole(userId: string, role: UserRole): Promise<UserView> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    return toUserView(user);
  }

  /**
   * Droit à l'effacement (RGPD) : supprime le compte Sentinelle de
   * l'utilisateur. Ses dons sont conservés mais anonymisés (donorId mis à
   * NULL par la clé étrangère). La suppression du compte chez le fournisseur
   * d'auth (Supabase) est à effectuer séparément.
   */
  async deleteSelf(userId: string): Promise<{ deleted: boolean }> {
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }
}
