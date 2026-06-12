import { Institute } from './institute.entity';
import { User } from '../../users/domain/user.entity';

export const INSTITUTE_REPOSITORY = Symbol('INSTITUTE_REPOSITORY');

export interface InstituteRepository {
  findById(id: string): Promise<Institute | null>;
  findAll(): Promise<Institute[]>;
  findAllByManager(managerId: string): Promise<Institute[]>;
  /**
   * Atomically create the institute, its manager user account, and the
   * manager→institute assignment in ONE transaction. Provisioning is a single
   * infrastructure operation so a partial failure can never leave an institute
   * without a manager.
   */
  provisionWithManager(institute: Institute, manager: User): Promise<void>;
}
