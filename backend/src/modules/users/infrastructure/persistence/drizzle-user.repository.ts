import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { User } from '../../domain/user.entity';
import { UserRole } from '../../../../shared/domain/user-role';
import { Username } from '../../domain/value-objects/username.vo';
import type { UserRepository } from '../../domain/user.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { users, userInstitutes } from './user.schema';
import { managerInstitutes } from '../../../institutes/infrastructure/persistence/manager-assignment.schema';
import { UserMapper } from './user.mapper';

/**
 * Concrete UserRepository backed by Drizzle — the ONLY place that touches the
 * ORM for users. Every read excludes soft-deleted rows (deleted_at IS NULL);
 * `delete` is a soft delete (spec 004).
 */
@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(
        and(eq(users.username, username.toString()), isNull(users.deletedAt)),
      )
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toRow(user);
    await this.db
      .insert(users)
      .values(row)
      .onConflictDoUpdate({ target: users.id, set: row });

    if (row.instituteId) {
      await this.addUserToInstitute(row.id, row.instituteId);
    }
  }

  /** Soft delete — preserves the row (and authored records) but hides it. */
  async delete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id));
  }

  async addUserToInstitute(userId: string, instituteId: string): Promise<void> {
    await this.db
      .insert(userInstitutes)
      .values({ userId, instituteId })
      .onConflictDoNothing();
  }

  async findInstituteIdsByUser(userId: string): Promise<string[]> {
    const directRows = await this.db
      .select({ instituteId: userInstitutes.instituteId })
      .from(userInstitutes)
      .where(eq(userInstitutes.userId, userId));

    const mgrRows = await this.db
      .select({ instituteId: managerInstitutes.instituteId })
      .from(managerInstitutes)
      .where(eq(managerInstitutes.managerId, userId));

    const userObj = await this.findById(userId);
    const homeInst = userObj?.instituteId ? [userObj.instituteId] : [];

    const all = [
      ...homeInst,
      ...directRows.map((r) => r.instituteId),
      ...mgrRows.map((r) => r.instituteId),
    ];
    return Array.from(new Set(all));
  }

  async findByInstitute(instituteId: string, role?: UserRole): Promise<User[]> {
    const memberRows = await this.db
      .select({ userId: userInstitutes.userId })
      .from(userInstitutes)
      .where(eq(userInstitutes.instituteId, instituteId));

    const memberUserIds = memberRows.map((r) => r.userId);

    const conditions = [
      isNull(users.deletedAt),
      memberUserIds.length > 0
        ? or(eq(users.instituteId, instituteId), inArray(users.id, memberUserIds))
        : eq(users.instituteId, instituteId),
    ];
    if (role) conditions.push(eq(users.role, role!));
    const rows = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(users)
      .where(and(inArray(users.id, ids), isNull(users.deletedAt)));
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async countByInstitute(
    instituteId: string,
    role?: UserRole,
  ): Promise<number> {
    const memberRows = await this.db
      .select({ userId: userInstitutes.userId })
      .from(userInstitutes)
      .where(eq(userInstitutes.instituteId, instituteId));

    const memberUserIds = memberRows.map((r) => r.userId);

    const conditions = [
      isNull(users.deletedAt),
      memberUserIds.length > 0
        ? or(eq(users.instituteId, instituteId), inArray(users.id, memberUserIds))
        : eq(users.instituteId, instituteId),
    ];
    if (role) conditions.push(eq(users.role, role!));
    const [row] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(...conditions));
    return Number(row?.n ?? 0);
  }

  async searchAllUsers(role?: UserRole, query?: string): Promise<User[]> {
    const conditions = [isNull(users.deletedAt)];
    if (role) conditions.push(eq(users.role, role));
    if (query && query.trim()) {
      const q = `%${query.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(users.username, q),
          ilike(users.firstName, q),
          ilike(users.lastName, q),
        )!,
      );
    }
    const rows = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(50);
    return rows.map((row) => UserMapper.toDomain(row));
  }
}
