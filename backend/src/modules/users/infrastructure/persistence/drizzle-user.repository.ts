import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { User } from '../../domain/user.entity';
import { UserRole } from '../../../../shared/domain/user-role';
import { Username } from '../../domain/value-objects/username.vo';
import type { UserRepository } from '../../domain/user.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { users } from './user.schema';
import { UserMapper } from './user.mapper';

/**
 * Concrete UserRepository backed by Drizzle — the ONLY place that touches the
 * ORM for users.
 */
@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username.toString()))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toRow(user);
    await this.db
      .insert(users)
      .values(row)
      .onConflictDoUpdate({ target: users.id, set: row });
  }

  async findByInstitute(instituteId: string, role?: UserRole): Promise<User[]> {
    const where = role
      ? and(eq(users.instituteId, instituteId), eq(users.role, role))
      : eq(users.instituteId, instituteId);
    const rows = await this.db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt));
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(users).where(inArray(users.id, ids));
    return rows.map((row) => UserMapper.toDomain(row));
  }
}
