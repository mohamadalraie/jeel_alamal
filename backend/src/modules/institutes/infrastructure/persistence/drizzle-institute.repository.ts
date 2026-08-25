import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { Institute } from '../../domain/institute.entity';
import type { InstituteRepository } from '../../domain/institute.repository';
import { User } from '../../../users/domain/user.entity';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { institutes, type InstituteRow } from './institute.schema';
import { managerInstitutes } from './manager-assignment.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';
import { UserMapper } from '../../../users/infrastructure/persistence/user.mapper';

const toDomain = (row: InstituteRow): Institute =>
  Institute.reconstitute(row.id, {
    name: row.name,
    place: row.place,
    description: row.description,
    logoUrl: row.logoUrl,
    createdAt: row.createdAt,
  });

const toRow = (institute: Institute): InstituteRow => ({
  id: institute.id,
  name: institute.name,
  place: institute.place,
  description: institute.description,
  logoUrl: institute.logoUrl,
  createdAt: institute.createdAt,
});

@Injectable()
export class DrizzleInstituteRepository implements InstituteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<Institute | null> {
    const [row] = await this.db
      .select()
      .from(institutes)
      .where(eq(institutes.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async save(institute: Institute): Promise<void> {
    const row = toRow(institute);
    await this.db
      .insert(institutes)
      .values(row)
      .onConflictDoUpdate({ target: institutes.id, set: row });
  }

  async findAll(): Promise<Institute[]> {
    const rows = await this.db
      .select()
      .from(institutes)
      .orderBy(desc(institutes.createdAt));
    return rows.map(toDomain);
  }

  async findAllByManager(managerId: string): Promise<Institute[]> {
    const rows = await this.db
      .select({ institute: institutes })
      .from(managerInstitutes)
      .innerJoin(institutes, eq(managerInstitutes.instituteId, institutes.id))
      .where(eq(managerInstitutes.managerId, managerId))
      .orderBy(desc(institutes.createdAt));
    return rows.map((r) => toDomain(r.institute));
  }

  /**
   * ONE transaction: institute + manager account + assignment. A failure at
   * any step rolls back everything — an institute can never exist without its
   * manager (spec 001 FR-2).
   */
  async provisionWithManager(
    institute: Institute,
    manager: User,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(institutes).values(toRow(institute));
      await tx.insert(users).values(UserMapper.toRow(manager));
      await tx.insert(managerInstitutes).values({
        managerId: manager.id,
        instituteId: institute.id,
        assignedAt: new Date(),
      });
    });
  }
}
