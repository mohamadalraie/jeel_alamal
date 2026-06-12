import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

/**
 * drizzle-kit config — used by `npm run db:generate` (SQL generation from the
 * *.schema.ts files) and `npm run migration:run` (apply ./drizzle/*.sql).
 * Runtime connection config lives in core/database/database.module.ts.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/*.schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB ?? 'jeel_alamal',
    ssl: false,
  },
});
