import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Public } from '../../../core/auth/public.decorator';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../../../core/auth/auth.guard';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import {
  LoginUseCase,
  LoginResult,
} from '../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case';
import {
  UnauthorizedError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { UserResponseDto } from '../../users/application/dto/user-response.dto';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // mirror JWT_EXPIRES_IN
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // mirror refresh TTL

/**
 * HTTP delivery for auth. Tokens travel ONLY as httpOnly cookies — they are
 * never exposed to client-side JavaScript (constitution IV).
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(dto.username, dto.password);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.[REFRESH_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedError('No refresh token');
    }
    const result = await this.refreshUseCase.execute(token);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() actor: Actor,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.logoutUseCase.execute(actor.userId);
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions());
    return { success: true };
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() actor: Actor,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.changePasswordUseCase.execute(
      actor,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me')
  async me(@CurrentUser() actor: Actor) {
    const user = await this.users.findById(actor.userId);
    if (!user) throw new NotFoundError('Account no longer exists');
    return { user: UserResponseDto.fromDomain(user) };
  }

  private setAuthCookies(res: Response, result: LoginResult): void {
    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      ...this.cookieOptions(),
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
  }

  private cookieOptions() {
    const isProd = this.config.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
