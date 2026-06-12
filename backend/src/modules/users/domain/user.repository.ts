import { User } from './user.entity';
import { Username } from './value-objects/username.vo';
import { UserRole } from '../../../shared/domain/user-role';

/**
 * Repository PORT owned by the domain; infrastructure supplies the Drizzle
 * implementation. Use-cases depend on this interface only — that keeps the
 * dependency arrows pointing inward.
 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: Username): Promise<User | null>;
  save(user: User): Promise<void>;
  /** Users of an institute, optionally filtered by role (tenant-scoped list). */
  findByInstitute(instituteId: string, role?: UserRole): Promise<User[]>;
  /** Ids that exist among the given ids AND belong to the institute+role. */
  findManyByIds(ids: string[]): Promise<User[]>;
}
