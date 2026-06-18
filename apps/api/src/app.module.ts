import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DonationsModule } from './donations/donations.module';
import { HealthController } from './health/health.controller';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { SitesModule } from './sites/sites.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Charge le .env local de l'app puis, à défaut, celui à la racine du monorepo.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    // Limitation de débit : 120 requêtes / minute / IP.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    SitesModule,
    ProjectsModule,
    DonationsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
