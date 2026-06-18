import 'reflect-metadata';
import { resolve } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // rawBody : nécessaire pour vérifier la signature des webhooks Stripe.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Validation globale des DTO (class-validator) — rejette tout champ inattendu.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Sert les fichiers stockés localement (devis) sous /uploads (mode dev).
  const config = app.get(ConfigService);
  const uploadsDir = resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  // CORS restreint aux origines déclarées (WEB_ORIGIN).
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`[api] Sentinelle API à l'écoute sur le port ${port}`);
}

void bootstrap();
