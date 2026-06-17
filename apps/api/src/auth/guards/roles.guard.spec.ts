import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@sentinelle/db';
import { RolesGuard } from './roles.guard';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  function guardRequiring(roles: UserRole[] | undefined): RolesGuard {
    const reflector = {
      getAllAndOverride: () => roles,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('laisse passer une route sans @Roles', () => {
    const guard = guardRequiring(undefined);
    expect(guard.canActivate(contextWithUser({ role: UserRole.DONOR }))).toBe(
      true,
    );
  });

  it('autorise un utilisateur possédant le rôle requis', () => {
    const guard = guardRequiring([UserRole.ADMIN]);
    expect(guard.canActivate(contextWithUser({ role: UserRole.ADMIN }))).toBe(
      true,
    );
  });

  it('refuse un utilisateur sans le rôle requis', () => {
    const guard = guardRequiring([UserRole.ADMIN]);
    expect(() =>
      guard.canActivate(contextWithUser({ role: UserRole.DONOR })),
    ).toThrow(ForbiddenException);
  });

  it('refuse une requête sans utilisateur', () => {
    const guard = guardRequiring([UserRole.ADMIN]);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
