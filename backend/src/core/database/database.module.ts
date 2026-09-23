import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE, PG_POOL, type DrizzleDb } from './drizzle.provider';
import * as schema from './schema';

/**
 * Global database module. Owns the single pg Pool and the Drizzle instance.
 * Feature modules inject DRIZZLE — they never construct their own connection.
 * Drizzle usage stays inside infrastructure layers (constitution I & VIII).
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
        if (dbUrl) {
          return new Pool({ connectionString: dbUrl, ssl });
        }
        let host = config.get<string>('DATABASE_HOST') || 'localhost';
        const isDocker = process.env.IS_DOCKER === 'true' || process.env.CONTAINER === 'true';
        if (host === 'db' && !isDocker) {
          host = 'localhost';
        }
        return new Pool({
          host,
          port: config.get<number>('DATABASE_PORT', 5432),
          user: config.get<string>('POSTGRES_USER'),
          password: config.get<string>('POSTGRES_PASSWORD'),
          database: config.get<string>('POSTGRES_DB'),
          ssl,
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): DrizzleDb => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown() {
    const pool = this.moduleRef.get<Pool>(PG_POOL);
    await pool.end();
  }
}
