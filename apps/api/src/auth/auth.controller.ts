import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
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
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um usuário ativo.' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas.' })
  login(
    @Body() loginDto: LoginDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AuthTokensDto> {
    return this.authService.login(loginDto, requestId ?? randomUUID());
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotaciona um refresh token válido.' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
  refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AuthTokensDto> {
    return this.authService.refresh(refreshTokenDto.refreshToken, requestId ?? randomUUID());
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga o refresh token atual.' })
  @ApiNoContentResponse({ description: 'Refresh token revogado.' })
  @ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<void> {
    await this.authService.logout(refreshTokenDto.refreshToken, requestId ?? randomUUID());
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
}
