import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

/**
 * DI tokens for the database. Repositories inject DRIZZLE; only infrastructure
 * code may import this file.
 */
export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDb = NodePgDatabase<typeof schema>;
