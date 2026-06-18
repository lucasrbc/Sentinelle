import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, type User } from '@sentinelle/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthIdentity } from './auth.types';

/**
 * Rapproche une identité vérifiée d'un compte Sentinelle. Crée le compte à la
 * première connexion (« just-in-time provisioning »), avec le rôle DONOR par
 * défaut, et promeut en ADMIN les emails listés dans `ADMIN_EMAILS` (amorçage
 * du premier administrateur).
 */
@Injectable()
export class AuthService {
  private readonly adminEmails: string[];

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.adminEmails = (config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  async findOrCreateUser(identity: AuthIdentity): Promise<User> {
    const email = identity.email?.toLowerCase() ?? null;
    const shouldBeAdmin = email ? this.adminEmails.includes(email) : false;

    // 1) Compte déjà lié à cet identifiant de fournisseur.
    let user = await this.prisma.user.findUnique({
      where: { authProviderId: identity.providerId },
    });

    // 2) Sinon, rattacher un compte existant portant le même email (email
    //    vérifié côté fournisseur), pour éviter un conflit d'unicité.
    if (!user && email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { authProviderId: identity.providerId },
        });
      }
    }

    // 3) Sinon, créer le compte (DONOR par défaut).
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          authProviderId: identity.providerId,
          // L'email est requis et unique ; valeur stable si le fournisseur n'en
          // transmet pas (cas limite, ex. connexion par téléphone).
          email: email ?? `${identity.providerId}@no-email.sentinelle.local`,
          role: shouldBeAdmin ? UserRole.ADMIN : UserRole.DONOR,
        },
      });
    }

    // Promotion idempotente : un email d'admin déjà inscrit en DONOR est élevé.
    if (shouldBeAdmin && user.role !== UserRole.ADMIN) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.ADMIN },
      });
    }

    return user;
  }
}
