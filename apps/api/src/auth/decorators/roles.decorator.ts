import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@sentinelle/db';

export const ROLES_KEY = 'roles';

/** Restreint une route aux rôles indiqués (ex. `@Roles('ADMIN')`). */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
