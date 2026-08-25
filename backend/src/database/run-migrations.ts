import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import 'dotenv/config';

/**
 * Standalone migration runner for production containers (drizzle-kit is a dev
 * dependency and is not shipped). Compiled to dist/ and invoked before the
 * server starts. Applies the SQL files in ./drizzle.
 */
async function run() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: 'drizzle' });

  console.log('Migrations applied.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
