import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '../../../shared/domain/user-role';
import { SearchUsersUseCase } from '../application/use-cases/search-users.use-case';

@Controller('users')
export class UsersController {
  constructor(private readonly searchUsers: SearchUsersUseCase) {}

  @Get('search')
  search(
    @Query('role') role?: UserRole,
    @Query('query') query?: string,
    @Query('q') q?: string,
  ) {
    return this.searchUsers.execute(role, query || q);
  }
}
