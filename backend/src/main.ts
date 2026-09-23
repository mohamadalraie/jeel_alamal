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
    let host = config.get<string>('DATABASE_HOST', 'localhost');
    const isDocker = process.env.IS_DOCKER === 'true' || process.env.CONTAINER === 'true';
    if (host === 'db' && !isDocker) {
      host = 'localhost';
    }
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
    // Explicit safety check: ensure enums and missing columns on users table exist
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'study_degree') THEN
              CREATE TYPE study_degree AS ENUM ('secondary', 'diploma', 'bachelor', 'master', 'phd');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tajweed_level') THEN
              CREATE TYPE tajweed_level AS ENUM ('excellent', 'very_good', 'good', 'acceptable', 'weak');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'track_type') THEN
              CREATE TYPE track_type AS ENUM ('regular', 'intensive');
          END IF;
      END $$;

      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_degree" study_degree;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_field" varchar(150);
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quran_parts" smallint;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tajweed_level" tajweed_level;
      
      ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "target_track" track_type DEFAULT 'regular';
      ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "expected_duration_minutes" integer;
      ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "actual_start_time" timestamp with time zone;
      ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "actual_end_time" timestamp with time zone;
      
      ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "expected_duration_minutes" integer;
      ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "track_type" track_type DEFAULT 'regular';
      ALTER TABLE "class_schedule" ADD COLUMN IF NOT EXISTS "track_type" track_type DEFAULT 'regular';
    `);
    Logger.log('✅ User profile columns and enum types ensured', 'Migrations');

    // Explicit safety check: ensure refresh_tokens table exists for Auth Refresh Token rotation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "expires_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    Logger.log('✅ refresh_tokens table ensured', 'Migrations');

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
