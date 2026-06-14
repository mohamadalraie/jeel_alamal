/**
 * Schema barrel. Re-exports every module's Drizzle tables so the typed
 * DrizzleDb instance and drizzle-kit see the whole schema. Add one line here
 * when a new module defines tables.
 */
export * from '../../modules/institutes/infrastructure/persistence/institute.schema';
export * from '../../modules/users/infrastructure/persistence/user.schema';
export * from '../../modules/institutes/infrastructure/persistence/manager-assignment.schema';
export * from '../../modules/classes/infrastructure/persistence/class.schema';
export * from '../../modules/auth/infrastructure/persistence/refresh-token.schema';
export * from '../../modules/profiles/infrastructure/persistence/profile.schema';
export * from '../../modules/recitations/infrastructure/persistence/recitation.schema';
