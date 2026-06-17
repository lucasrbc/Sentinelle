import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@sentinelle/db';
import { AuthService } from '../auth.service';
import type { AuthProvider } from '../auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';

function context(
  headers: Record<string, string>,
  isPublic = false,
): { ctx: ExecutionContext; request: { headers: Record<string, string>; user?: unknown } } {
  const request = { headers } as { headers: Record<string, string>; user?: unknown };
  void isPublic;
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('JwtAuthGuard', () => {
  function buildGuard(opts: {
    isPublic?: boolean;
    verify?: AuthProvider['verifyToken'];
  }): { guard: JwtAuthGuard; findOrCreate: jest.Mock } {
    const reflector = {
      getAllAndOverride: () => opts.isPublic ?? false,
    } as unknown as Reflector;
    const provider: AuthProvider = {
      verifyToken:
        opts.verify ??
        jest.fn().mockResolvedValue({ providerId: 'sub-1', email: 'a@b.fr' }),
    };
    const findOrCreate = jest
      .fn()
      .mockResolvedValue({ id: 'u1', role: UserRole.DONOR });
    const authService = { findOrCreateUser: findOrCreate } as unknown as AuthService;
    return { guard: new JwtAuthGuard(reflector, provider, authService), findOrCreate };
  }

  it('laisse passer une route @Public sans jeton', async () => {
    const { guard } = buildGuard({ isPublic: true });
    const { ctx } = context({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('refuse une requête sans en-tête Authorization', async () => {
    const { guard } = buildGuard({});
    const { ctx } = context({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('attache l’utilisateur quand le jeton est valide', async () => {
    const { guard, findOrCreate } = buildGuard({});
    const { ctx, request } = context({ authorization: 'Bearer abc.def.ghi' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(findOrCreate).toHaveBeenCalledWith({
      providerId: 'sub-1',
      email: 'a@b.fr',
    });
    expect(request.user).toEqual({ id: 'u1', role: UserRole.DONOR });
  });
});
