import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
} from './modules/uploads/uploads.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security headers + httpOnly auth cookies.
  // Allow cross-origin <img> loads so the frontend can show uploaded logos.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // Serve uploaded files (logos, etc.) read-only at /uploads.
  app.use(UPLOADS_URL_PREFIX, express.static(UPLOADS_DIR));

  // CORS — allow requests from local development, FRONTEND_ORIGIN allowlist, and almanshiah.io domains.
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const rawOrigin = config.get<string>('FRONTEND_ORIGIN', '*');
  const allowlist = (rawOrigin || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (
        !isProd ||
        allowlist.includes('*') ||
        allowlist.includes(requestOrigin) ||
        requestOrigin.endsWith('.almanshiah.io') ||
        requestOrigin === 'https://almanshiah.io'
      ) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'X-Institute-Id',
    ],
  });

  // Global validation: strips unknown props, transforms payloads to DTO instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Consistent error envelope across the API
  app.useGlobalFilters(new HttpExceptionFilter());

  // Versioned API prefix; /health stays unprefixed for container probes
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = config.get<number>('BACKEND_PORT', 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Backend running on http://localhost:${port}`, 'Bootstrap');
}
void bootstrap();
