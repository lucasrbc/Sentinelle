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

    const user = await this.prisma.user.upsert({
      where: { authProviderId: identity.providerId },
      create: {
        authProviderId: identity.providerId,
        // L'email est requis et unique ; on conserve une valeur stable si le
        // fournisseur n'en transmet pas (cas limite, ex. connexion par téléphone).
        email: email ?? `${identity.providerId}@no-email.sentinelle.local`,
        role: shouldBeAdmin ? UserRole.ADMIN : UserRole.DONOR,
      },
      update: {},
    });

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
