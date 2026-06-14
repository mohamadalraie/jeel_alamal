import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import type { ManagerAssignmentRepository } from '../../domain/manager-assignment.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { managerInstitutes } from './manager-assignment.schema';

@Injectable()
export class DrizzleManagerAssignmentRepository
  implements ManagerAssignmentRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async isAssigned(managerId: string, instituteId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ managerId: managerInstitutes.managerId })
      .from(managerInstitutes)
      .where(
        and(
          eq(managerInstitutes.managerId, managerId),
          eq(managerInstitutes.instituteId, instituteId),
        ),
      )
      .limit(1);
    return !!row;
  }

  async assign(managerId: string, instituteId: string): Promise<void> {
    await this.db
      .insert(managerInstitutes)
      .values({ managerId, instituteId, assignedAt: new Date() })
      .onConflictDoNothing();
  }

  async countManagers(instituteId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(managerInstitutes)
      .where(eq(managerInstitutes.instituteId, instituteId));
    return Number(row?.n ?? 0);
  }
}
