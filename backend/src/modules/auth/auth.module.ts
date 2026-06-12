import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { TOKEN_SIGNER } from './application/ports/token-signer.port';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token.repository';
import { JwtTokenSigner } from './infrastructure/jwt-token-signer';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle-refresh-token.repository';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    { provide: TOKEN_SIGNER, useClass: JwtTokenSigner },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: DrizzleRefreshTokenRepository,
    },
  ],
})
export class AuthModule {}
