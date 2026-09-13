import { Module } from '@nestjs/common';

import { CreateUserAccountUseCase } from './application/use-cases/create-user-account.use-case';
import { SearchUsersUseCase } from './application/use-cases/search-users.use-case';
import { USER_REPOSITORY } from './domain/user.repository';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { UsersController } from './presentation/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    CreateUserAccountUseCase,
    SearchUsersUseCase,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER, CreateUserAccountUseCase, SearchUsersUseCase],
})
export class UsersModule {}
