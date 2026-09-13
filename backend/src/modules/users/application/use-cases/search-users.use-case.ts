import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/user.repository';
import type { UserRepository } from '../../domain/user.repository';
import { UserRole } from '../../../../shared/domain/user-role';
import { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class SearchUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(role?: UserRole, query?: string): Promise<UserResponseDto[]> {
    const list = await this.users.searchAllUsers(role, query);
    return list.map((u) => UserResponseDto.fromDomain(u));
  }
}
