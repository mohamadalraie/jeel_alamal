import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { users } from '../modules/users/infrastructure/persistence/user.schema';

/**
 * Idempotent seed: ensures the SINGLE super admin exists (constitution III —
 * exactly one). Runs after migrations in both dev and prod containers.
 * Credentials come from SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD env vars.
 */
async function seed() {
  const username = (process.env.SUPER_ADMIN_USERNAME ?? 'superadmin')
    .trim()
    .toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });
  const db = drizzle(pool);

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (existing) {
      console.log('Seed: super admin already exists — nothing to do.');
      return;
    }

    if (!password || password.length < 8) {
      throw new Error(
        'SUPER_ADMIN_PASSWORD (min 8 chars) is required to seed the super admin',
      );
    }

    await db.insert(users).values({
      id: randomUUID(),
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'super_admin',
      firstName: 'Super',
      lastName: 'Admin',
      birthDate: null,
      phone: null,
      schoolGrade: null,
      instituteId: null,
      createdAt: new Date(),
    });
    console.log(`Seed: created super admin "${username}".`);
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
