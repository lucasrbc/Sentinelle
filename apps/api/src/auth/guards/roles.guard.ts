import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@sentinelle/db';
import { type AuthenticatedRequest } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Garde globale de rôles : si une route déclare `@Roles(...)`, vérifie que
 * l'utilisateur authentifié possède l'un des rôles requis. Sans `@Roles`,
 * laisse passer (l'authentification reste assurée par JwtAuthGuard).
 *
 * La vérification est faite côté serveur : on ne fait jamais confiance au
 * navigateur pour le contrôle d'accès.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Accès réservé : rôle insuffisant');
    }
    return true;
  }
}
