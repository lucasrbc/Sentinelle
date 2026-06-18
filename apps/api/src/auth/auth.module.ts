import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER, type AuthProvider } from './auth.types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { DevAuthProvider } from './providers/dev-auth.provider';
import { SupabaseAuthProvider } from './providers/supabase-auth.provider';

/**
 * Choisit le fournisseur d'auth selon `AUTH_PROVIDER` (`supabase` par défaut,
 * `dev` pour les tests locaux/CI).
 */
const authProviderFactory = {
  provide: AUTH_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AuthProvider => {
    const kind = (config.get<string>('AUTH_PROVIDER') ?? 'supabase').toLowerCase();
    return kind === 'dev'
      ? new DevAuthProvider(config)
      : new SupabaseAuthProvider(config);
  },
};

@Global()
@Module({
  providers: [
    AuthService,
    authProviderFactory,
    // Gardes globales : authentification d'abord, puis contrôle des rôles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, AUTH_PROVIDER],
})
export class AuthModule {}
