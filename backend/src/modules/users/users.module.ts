import { Module } from '@nestjs/common';

import { CreateUserAccountUseCase } from './application/use-cases/create-user-account.use-case';
import { USER_REPOSITORY } from './domain/user.repository';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';

/**
 * Composition root for the Users bounded context — the identity building block
 * used by auth, institutes, and classes. No public controller: account
 * creation always flows through an authorising use-case in another module.
 */
@Module({
  providers: [
    CreateUserAccountUseCase,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER, CreateUserAccountUseCase],
})
export class UsersModule {}
