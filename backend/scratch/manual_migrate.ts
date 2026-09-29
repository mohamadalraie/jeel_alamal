import { Client } from 'pg';
import 'dotenv/config';

async function applyMigration() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'db',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.POSTGRES_USER || 'jeel',
    password: process.env.POSTGRES_PASSWORD || 'change_me_in_local',
    database: process.env.POSTGRES_DB || 'jeel_alamal',
  });
  
  await client.connect();
  
  try {
    await client.query(`ALTER TABLE "announcements" ADD COLUMN "target_track" varchar DEFAULT 'all';`);
    console.log('Migration for target_track applied successfully');
  } catch (err: any) {
    console.error('Migration 1 failed:', err.message);
  }
  
  try {
    await client.query(`ALTER TABLE "lesson_classes" ADD COLUMN "target_track" varchar DEFAULT 'regular' NOT NULL;`);
    console.log('Migration for lesson_classes target_track applied successfully');
  } catch (err: any) {
    console.error('Migration 2 failed:', err.message);
  }

  try {
    await client.query(`ALTER TABLE "class_schedule" ADD COLUMN "kind" varchar DEFAULT 'lesson' NOT NULL;`);
    console.log('Migration for class_schedule kind applied successfully');
  } catch (err: any) {
    console.error('Migration 3 failed:', err.message);
  }

  await client.end();
  process.exit(0);
}

applyMigration();
