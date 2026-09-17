import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
} from './modules/uploads/uploads.config';

async function runAutoMigrations(config: ConfigService) {
  try {
    const host = config.get<string>('DATABASE_HOST', 'localhost');
    const port = config.get<number>('DATABASE_PORT', 5432);
    const user = config.get<string>('POSTGRES_USER', 'jeel');
    const password = config.get<string>('POSTGRES_PASSWORD', 'change_me_in_local');
    const database = config.get<string>('POSTGRES_DB', 'jeel_alamal');

    const pool = new Pool({ host, port, user, password, database });
    const db = drizzle(pool);
    const migrationsFolder = join(process.cwd(), 'drizzle');
    if (existsSync(migrationsFolder)) {
      await migrate(db, { migrationsFolder });
      Logger.log('✅ Database migrations auto-applied successfully', 'Migrations');
    }
    // Explicit safety check: ensure user_institutes table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_institutes" (
        "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
        "institute_id" uuid NOT NULL REFERENCES "public"."institutes"("id") ON DELETE CASCADE,
        "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
        PRIMARY KEY ("user_id", "institute_id")
      );
    `);
    // Backfill: sync existing users that have institute_id into user_institutes
    // so multi-institute membership queries always find them.
    await pool.query(`
      INSERT INTO "user_institutes" ("user_id", "institute_id", "joined_at")
      SELECT u.id, u.institute_id, COALESCE(u.created_at, now())
      FROM "users" u
      WHERE u.institute_id IS NOT NULL
        AND u.deleted_at IS NULL
      ON CONFLICT DO NOTHING;
    `);
    // Ensure push_subscriptions table exists for Web Push notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" uuid PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
        "endpoint" text NOT NULL UNIQUE,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    Logger.log('✅ push_subscriptions table ensured', 'Migrations');
    await pool.end();
  } catch (err: any) {
    Logger.error(`Auto-migration note: ${err?.message || err}`, 'Migrations');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Auto-run Drizzle DB migrations on boot if pending
  await runAutoMigrations(config);

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
