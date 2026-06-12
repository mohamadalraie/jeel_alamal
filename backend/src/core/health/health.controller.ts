import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.provider';
import type { DrizzleDb } from '../database/drizzle.provider';
import { Public } from '../auth/public.decorator';

/**
 * Liveness/readiness probe used by Docker healthchecks and orchestrators.
 * Returns "ok" only when the DB connection answers a trivial query.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  @Get()
  async check() {
    let db = 'down';
    try {
      await this.db.execute(sql`SELECT 1`);
      db = 'up';
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      service: 'jeel-alamal-backend',
      db,
      timestamp: new Date().toISOString(),
    };
  }
}
