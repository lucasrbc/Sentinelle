import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '@sentinelle/db';
import type { AuthenticatedRequest } from '../auth.types';

/** Injecte l'utilisateur Sentinelle authentifié dans un handler de contrôleur. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
