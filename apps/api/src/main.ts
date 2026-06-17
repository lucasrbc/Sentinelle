import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Validation globale des DTO (class-validator) — rejette tout champ inattendu.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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
