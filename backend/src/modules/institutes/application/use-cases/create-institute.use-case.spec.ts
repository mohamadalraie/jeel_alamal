import { CreateInstituteUseCase } from './create-institute.use-case';
import { CreateUserAccountUseCase } from '../../../users/application/use-cases/create-user-account.use-case';
import { Institute } from '../../domain/institute.entity';
import type { InstituteRepository } from '../../domain/institute.repository';
import { User } from '../../../users/domain/user.entity';
import { Username } from '../../../users/domain/value-objects/username.vo';
import type { UserRepository } from '../../../users/domain/user.repository';
import type { PasswordHasher } from '../../../users/application/ports/password-hasher.port';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  ConflictError,
  ForbiddenError,
} from '../../../../shared/domain/domain.error';
import type { Actor } from '../../../../shared/application/actor';

/**
 * Pure unit test — no Nest, no database. Verifies the security-critical rules:
 * only the super admin can provision, and provisioning is one atomic call.
 */
class InMemoryUserRepository implements UserRepository {
  store = new Map<string, User>();
  findById(id: string) {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findByUsername(username: Username) {
    const match = [...this.store.values()].find((u) =>
      u.username.equals(username),
    );
    return Promise.resolve(match ?? null);
  }
  save(user: User) {
    this.store.set(user.id, user);
    return Promise.resolve();
  }
  findByInstitute() {
    return Promise.resolve([]);
  }
  findManyByIds() {
    return Promise.resolve([]);
  }
  delete() {
    return Promise.resolve();
  }
  countByInstitute() {
    return Promise.resolve(0);
  }
}

const fakeHasher: PasswordHasher = {
  hash: (plain) => Promise.resolve(`hashed:${plain}`),
  compare: (plain, hash) => Promise.resolve(hash === `hashed:${plain}`),
};

class FakeInstituteRepository implements InstituteRepository {
  provisioned: Array<{ institute: Institute; manager: User }> = [];
  findById() {
    return Promise.resolve(null);
  }
  findAll() {
    return Promise.resolve([]);
  }
  findAllByManager() {
    return Promise.resolve([]);
  }
  provisionWithManager(institute: Institute, manager: User) {
    this.provisioned.push({ institute, manager });
    return Promise.resolve();
  }
  save() {
    return Promise.resolve();
  }
}

const superAdmin: Actor = {
  userId: 'sa-1',
  role: UserRole.SuperAdmin,
  instituteId: null,
};
const someManager: Actor = {
  userId: 'm-1',
  role: UserRole.InstituteManager,
  instituteId: null,
};

const dto = {
  name: 'معهد جيل العمل',
  place: 'دمشق',
  description: 'وصف',
  manager: {
    firstName: 'Mohamad',
    lastName: 'Manager',
    birthDate: '1990-05-10',
    phone: '+963900000000',
    username: 'Manager.One',
    password: 'password123',
  },
};

describe('CreateInstituteUseCase', () => {
  let users: InMemoryUserRepository;
  let institutes: FakeInstituteRepository;
  let useCase: CreateInstituteUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    institutes = new FakeInstituteRepository();
    useCase = new CreateInstituteUseCase(
      institutes,
      new CreateUserAccountUseCase(users, fakeHasher),
    );
  });

  it('provisions institute + manager atomically for the super admin', async () => {
    const result = await useCase.execute(superAdmin, dto);

    expect(institutes.provisioned).toHaveLength(1);
    const { institute, manager } = institutes.provisioned[0];
    expect(institute.name).toBe('معهد جيل العمل');
    expect(manager.role).toBe(UserRole.InstituteManager);
    expect(manager.username.toString()).toBe('manager.one'); // normalised
    expect(manager.passwordHash).toBe('hashed:password123');
    expect(result.manager.username).toBe('manager.one');
    // password hash never leaves the application boundary
    expect(
      (result.manager as unknown as { passwordHash?: string }).passwordHash,
    ).toBeUndefined();
  });

  it('denies every non-super-admin actor', async () => {
    await expect(useCase.execute(someManager, dto)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(institutes.provisioned).toHaveLength(0);
  });

  it('rejects a duplicate manager username before provisioning', async () => {
    await users.save(
      User.create({
        username: Username.create('manager.one'),
        firstName: 'Taken',
        lastName: 'User',
        passwordHash: 'x',
        role: UserRole.InstituteManager,
      }),
    );
    await expect(useCase.execute(superAdmin, dto)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(institutes.provisioned).toHaveLength(0);
  });
});
