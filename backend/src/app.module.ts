import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { validateEnv } from './core/config/env.validation';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './core/health/health.module';
import { AuthGuard } from './core/auth/auth.guard';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { InstitutesModule } from './modules/institutes/institutes.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { RecitationsModule } from './modules/recitations/recitations.module';

@Module({
  imports: [
    // Global, validated configuration sourced from .env
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // Drizzle + pg pool, configured from validated env (global)
    DatabaseModule,

    // JwtService for the global AuthGuard (secrets passed per call)
    JwtModule.register({}),

    // Basic rate limiting: 100 requests / 60s per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Cross-cutting
    HealthModule,

    // Feature modules (bounded contexts)
    UsersModule,
    AuthModule,
    InstitutesModule,
    ClassesModule,
    ProfilesModule,
    UploadsModule,
    StatisticsModule,
    RecitationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Deny-by-default authentication on every endpoint (opt out via @Public)
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
