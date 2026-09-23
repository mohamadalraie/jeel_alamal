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
  let pool: Pool | null = null;
  try {
    const dbUrl = config.get<string>('DATABASE_URL');
    const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
    if (dbUrl) {
      pool = new Pool({ connectionString: dbUrl, ssl });
    } else {
      const host = config.get<string>('DATABASE_HOST', 'localhost');
      const port = config.get<number>('DATABASE_PORT', 5432);
      const user = config.get<string>('POSTGRES_USER', 'jeel');
      const password = config.get<string>('POSTGRES_PASSWORD', 'change_me_in_local');
      const database = config.get<string>('POSTGRES_DB', 'jeel_alamal');

      pool = new Pool({ host, port, user, password, database, ssl });
    }
    const db = drizzle(pool);
    const migrationsFolder = join(process.cwd(), 'drizzle');
    if (existsSync(migrationsFolder)) {
      try {
        await migrate(db, { migrationsFolder });
        Logger.log('✅ Database migrations auto-applied successfully', 'Migrations');
      } catch (err: any) {
        Logger.warn(`Drizzle migrate note: ${err?.message || err}`, 'Migrations');
      }
    }

    const safeQuery = async (querySql: string, label: string) => {
      try {
        await pool!.query(querySql);
        Logger.log(`✅ Safe Migration (${label}) succeeded`, 'Migrations');
      } catch (err: any) {
        Logger.warn(`Safe Migration (${label}) note: ${err?.message || err}`, 'Migrations');
      }
    };

    // 1. Enums
    await safeQuery(`CREATE TYPE "public"."study_degree" AS ENUM('secondary', 'diploma', 'bachelor', 'master', 'phd');`, 'Type study_degree');
    await safeQuery(`CREATE TYPE "public"."tajweed_level" AS ENUM('excellent', 'very_good', 'good', 'acceptable', 'weak');`, 'Type tajweed_level');
    await safeQuery(`CREATE TYPE "public"."track_type" AS ENUM('regular', 'intensive');`, 'Type track_type');

    // 2. Users table missing profile columns
    await safeQuery(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_degree" "public"."study_degree";`, 'users.study_degree');
    await safeQuery(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_field" varchar(150);`, 'users.study_field');
    await safeQuery(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quran_parts" smallint;`, 'users.quran_parts');
    await safeQuery(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tajweed_level" "public"."tajweed_level";`, 'users.tajweed_level');

    // 3. Lesson classes missing columns
    await safeQuery(`ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "target_track" "public"."track_type" DEFAULT 'regular';`, 'lesson_classes.target_track');
    await safeQuery(`ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "expected_duration_minutes" integer;`, 'lesson_classes.expected_duration_minutes');
    await safeQuery(`ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "actual_start_time" timestamp with time zone;`, 'lesson_classes.actual_start_time');
    await safeQuery(`ALTER TABLE "lesson_classes" ADD COLUMN IF NOT EXISTS "actual_end_time" timestamp with time zone;`, 'lesson_classes.actual_end_time');

    // 4. Lessons, Attendance, Schedule missing columns
    await safeQuery(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "expected_duration_minutes" integer;`, 'lessons.expected_duration_minutes');
    await safeQuery(`ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "track_type" "public"."track_type" DEFAULT 'regular';`, 'attendance_sessions.track_type');
    await safeQuery(`ALTER TABLE "class_schedule" ADD COLUMN IF NOT EXISTS "track_type" "public"."track_type" DEFAULT 'regular';`, 'class_schedule.track_type');

    // 5. Auth refresh tokens table
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "expires_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `, 'Table refresh_tokens');

    // 6. User institutes table & backfill
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "user_institutes" (
        "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
        "institute_id" uuid NOT NULL REFERENCES "public"."institutes"("id") ON DELETE CASCADE,
        "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
        PRIMARY KEY ("user_id", "institute_id")
      );
    `, 'Table user_institutes');

    await safeQuery(`
      INSERT INTO "user_institutes" ("user_id", "institute_id", "joined_at")
      SELECT u.id, u.institute_id, COALESCE(u.created_at, now())
      FROM "users" u
      WHERE u.institute_id IS NOT NULL
        AND u.deleted_at IS NULL
      ON CONFLICT DO NOTHING;
    `, 'Backfill user_institutes');

    // 7. Push subscriptions table
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" uuid PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
        "endpoint" text NOT NULL UNIQUE,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `, 'Table push_subscriptions');

  } catch (err: any) {
    Logger.error(`Auto-migration top-level note: ${err?.message || err}`, 'Migrations');
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch {}
    }
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
