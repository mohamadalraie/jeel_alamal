import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { NotFoundError } from '../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import {
  DINAR_TRANSACTION_REPOSITORY,
  type DinarTransactionRepository,
} from '../domain/dinar-transaction.repository';
import { toLedgerItem } from './dinar-mappers';
import { StudentDinarsView } from './dto/dinar.dto';

/** A student's dinar summary + ledger. The student themselves, or institute staff. */
@Injectable()
export class GetStudentDinarsUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(actor: Actor, studentId: string): Promise<StudentDinarsView> {
    const student = await this.users.findById(studentId);
    if (!student || student.role !== UserRole.Student || !student.instituteId) {
      throw new NotFoundError('Student not found');
    }
    const isSelf =
      actor.role === UserRole.Student && actor.userId === studentId;
    if (!isSelf) {
      await this.policy.assertStaffOf(actor, student.instituteId);
    }

    const [summary, ledger] = await Promise.all([
      this.txns.summaryByStudent(studentId),
      this.txns.findByStudent(studentId),
    ]);

    const staffIds = [
      ...new Set(
        ledger.map((t) => t.awardedBy).filter((id): id is string => !!id),
      ),
    ];
    const staff = await this.users.findManyByIds(staffIds);
    const nameMap = new Map(staff.map((u) => [u.id, u.fullName]));
    const nameOf = (id: string) => nameMap.get(id) ?? '—';

    return {
      summary,
      ledger: ledger.map((t) => toLedgerItem(t, nameOf)),
    };
  }
}
