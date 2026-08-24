import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import {
  getClearRefreshTokenCookieOptions,
  getRefreshTokenCookieOptions,
  REFRESH_TOKEN_COOKIE,
} from './auth-cookie';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um usuário ativo.' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas.' })
  login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AuthTokensDto> {
    return this.authService.login(loginDto, requestId ?? randomUUID()).then((tokens) => {
      response.cookie(
        REFRESH_TOKEN_COOKIE,
        tokens.refreshToken,
        getRefreshTokenCookieOptions(this.configService),
      );
      return this.authService.toAuthTokens(tokens);
    });
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotaciona um refresh token válido.' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AuthTokensDto> {
    return this.authService
      .refresh(this.getRefreshToken(request), requestId ?? randomUUID())
      .then((tokens) => {
        response.cookie(
          REFRESH_TOKEN_COOKIE,
          tokens.refreshToken,
          getRefreshTokenCookieOptions(this.configService),
        );
        return this.authService.toAuthTokens(tokens);
      });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga o refresh token atual.' })
  @ApiNoContentResponse({ description: 'Refresh token revogado.' })
  @ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('x-request-id') requestId?: string,
  ): Promise<void> {
    try {
      await this.authService.logout(this.getRefreshToken(request), requestId ?? randomUUID());
    } finally {
      response.clearCookie(
        REFRESH_TOKEN_COOKIE,
        getClearRefreshTokenCookieOptions(this.configService),
      );
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuário autenticado.' })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
  me(@CurrentUser() user: AuthenticatedUser): CurrentUserDto {
    return this.authService.getCurrentUser(user);
  }

  private getRefreshToken(request: Request): string {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof refreshToken !== 'string') {
      return '';
    }
    return refreshToken;
  }
}
